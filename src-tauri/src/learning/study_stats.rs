use super::{
    storage_metadata::{read_metadata, write_metadata},
    Store,
};
use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;

#[derive(Serialize)]
pub struct ActivityDay {
    pub date: String,
    pub count: u64,
}
#[derive(Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyStats {
    pub total_xp: u64,
    pub streak: u64,
    pub last_study_date: Option<String>,
    pub daily_goal: u64,
    pub today_reviews: u64,
    pub today_correct: u64,
    pub today_xp: u64,
    pub today_duration_ms: u64,
    pub heatmap: Vec<ActivityDay>,
    pub combo: u64,
}

fn count(row: &rusqlite::Row<'_>, index: usize) -> rusqlite::Result<u64> {
    let value: i64 = row.get(index)?;
    u64::try_from(value).map_err(|error| {
        rusqlite::Error::FromSqlConversionFailure(
            index,
            rusqlite::types::Type::Integer,
            Box::new(error),
        )
    })
}

fn number(value: &Value, key: &str) -> u64 {
    value.get(key).and_then(Value::as_u64).unwrap_or(0)
}
fn valid_date(value: &str) -> bool {
    chrono::NaiveDate::parse_from_str(value, "%Y-%m-%d").is_ok()
}

fn baseline(profile: &Value, today: &str) -> StudyStats {
    let last = profile
        .get("lastStudyDate")
        .and_then(Value::as_str)
        .filter(|date| valid_date(date));
    let same = last == Some(today);
    StudyStats {
        total_xp: number(profile, "totalXp"),
        streak: number(profile, "streak"),
        last_study_date: last.map(String::from),
        today_reviews: if same {
            number(profile, "todayReviews")
        } else {
            0
        },
        today_correct: if same {
            number(profile, "todayCorrect")
        } else {
            0
        },
        today_xp: if same { number(profile, "todayXp") } else { 0 },
        today_duration_ms: if same {
            number(profile, "todayDurationMs")
        } else {
            0
        },
        combo: if same { number(profile, "combo") } else { 0 },
        ..StudyStats::default()
    }
}

fn advance_streak(stats: &mut StudyStats, day: &str) {
    if stats
        .last_study_date
        .as_deref()
        .is_some_and(|last| last >= day)
    {
        return;
    }
    let adjacent = stats
        .last_study_date
        .as_deref()
        .and_then(|last| chrono::NaiveDate::parse_from_str(last, "%Y-%m-%d").ok())
        .and_then(|last| last.succ_opt())
        .is_some_and(|next| next.to_string() == day);
    stats.streak = if adjacent {
        stats.streak.saturating_add(1)
    } else {
        1
    };
    stats.last_study_date = Some(day.into());
}

impl Store {
    pub fn study_stats(&self) -> Result<StudyStats, String> {
        self.require_learning_ready()?;
        let today = chrono::Local::now().format("%Y-%m-%d").to_string();
        let profile: Value = read_metadata(&self.conn, "legacyProfile")?.unwrap_or(Value::Null);
        let mut stats = baseline(&profile, &today);
        stats.daily_goal = read_metadata(&self.conn, "dailyGoal")?.unwrap_or(20);
        let mut heatmap = BTreeMap::new();
        if let Some(days) = profile.get("heatmap").and_then(Value::as_array) {
            for day in days {
                if let Some(date) = day
                    .get("date")
                    .and_then(Value::as_str)
                    .filter(|date| valid_date(date))
                {
                    heatmap.insert(date.to_owned(), number(day, "count"));
                }
            }
        }
        let mut query=self.conn.prepare("SELECT date(reviewed_at/1000,'unixepoch','localtime'),sum(session_id IS NOT NULL),sum(session_id IS NOT NULL AND rating>=3),coalesce(sum(duration_ms),0),coalesce(sum(json_extract(after_json,'$.earnedXp')),0),sum(session_id IS NULL),sum(session_id IS NULL AND rating>=3) FROM reviews WHERE undone_at IS NULL GROUP BY 1 ORDER BY 1").map_err(|error|error.to_string())?;
        let rows = query
            .query_map([], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    count(row, 1)?,
                    count(row, 2)?,
                    count(row, 3)?,
                    count(row, 4)?,
                    count(row, 5)?,
                    count(row, 6)?,
                ))
            })
            .map_err(|error| error.to_string())?;
        for row in rows {
            let (date, reviews, correct, duration, xp, legacy, legacy_correct) =
                row.map_err(|error| error.to_string())?;
            stats.total_xp = stats.total_xp.saturating_add(xp);
            let previous = heatmap.entry(date.clone()).or_insert(0_u64);
            *previous = (*previous).max(legacy).saturating_add(reviews);
            advance_streak(&mut stats, &date);
            if date == today {
                stats.today_reviews = stats.today_reviews.max(legacy).saturating_add(reviews);
                stats.today_correct = stats
                    .today_correct
                    .max(legacy_correct)
                    .saturating_add(correct);
                stats.today_duration_ms = stats.today_duration_ms.saturating_add(duration);
                stats.today_xp = stats.today_xp.saturating_add(xp);
            }
        }
        let yesterday = (chrono::Local::now().date_naive() - chrono::Duration::days(1)).to_string();
        if stats
            .last_study_date
            .as_deref()
            .is_some_and(|last| last < yesterday.as_str())
        {
            stats.streak = 0;
        }
        let mut ratings=self.conn.prepare("SELECT rating FROM reviews WHERE session_id IS NOT NULL AND undone_at IS NULL AND date(reviewed_at/1000,'unixepoch','localtime')=?1 ORDER BY rowid DESC").map_err(|error|error.to_string())?;
        let ratings = ratings
            .query_map([&today], |row| row.get::<_, u8>(0))
            .map_err(|error| error.to_string())?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?;
        let correct = ratings.iter().take_while(|rating| **rating >= 3).count() as u64;
        stats.combo = correct
            + if correct as usize == ratings.len() {
                stats.combo
            } else {
                0
            };
        stats.heatmap = heatmap
            .into_iter()
            .map(|(date, count)| ActivityDay { date, count })
            .collect();
        Ok(stats)
    }

    pub fn set_daily_goal(&mut self, goal: u64) -> Result<StudyStats, String> {
        self.require_learning_ready()?;
        if !(1..=10000).contains(&goal) {
            return Err("Daily goal must be between 1 and 10000 reviews".into());
        }
        let transaction = self.conn.transaction().map_err(|error| error.to_string())?;
        write_metadata(&transaction, "dailyGoal", &goal)?;
        transaction.commit().map_err(|error| error.to_string())?;
        self.study_stats()
    }
}
