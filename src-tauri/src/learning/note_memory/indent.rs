//! Distinguish indented code from paragraph/list continuations when collecting media.
use regex::Regex;
use std::sync::OnceLock;

#[derive(Default)]
pub(super) struct CodeIndent {
    paragraph: bool,
    list_indent: Option<usize>,
    code: bool,
}
fn columns(text: &str, start: usize) -> usize {
    text.chars().fold(start, |column, ch| {
        if ch == '\t' {
            column + 4 - column % 4
        } else {
            column + 1
        }
    })
}
impl CodeIndent {
    pub(super) fn boundary(&mut self) {
        self.paragraph = false;
        self.code = false;
    }
    pub(super) fn masks(&mut self, text: &str) -> bool {
        if text.trim().is_empty() {
            self.paragraph = false;
            return self.code;
        }
        let rest = text.trim_start_matches([' ', '\t']);
        let indent = columns(&text[..text.len() - rest.len()], 0);
        static LIST: OnceLock<Regex> = OnceLock::new();
        let list = LIST.get_or_init(|| {
            Regex::new(r"^(?:[-+*]|[0-9]{1,9}[.)])[ \t]+").expect("static list marker regex")
        });
        if let Some(marker) = list
            .find(rest)
            .filter(|_| indent < self.list_indent.unwrap_or(0) + 4)
        {
            self.list_indent = Some(columns(marker.as_str(), indent));
            self.paragraph = !rest[marker.end()..].trim().is_empty();
            self.code = false;
            return false;
        }
        if !self.paragraph && self.list_indent.is_some_and(|base| indent < base) {
            self.list_indent = None;
        }
        if indent >= self.list_indent.unwrap_or(0) + 4 && (!self.paragraph || self.code) {
            self.code = true;
            return true;
        }
        self.code = false;
        let heading = rest.trim_start_matches('#');
        let hashes = rest.len() - heading.len();
        self.paragraph = !(hashes > 0
            && hashes <= 6
            && (heading.is_empty() || heading.starts_with([' ', '\t'])));
        false
    }
}
