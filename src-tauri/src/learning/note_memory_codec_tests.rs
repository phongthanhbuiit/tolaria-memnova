use super::note_memory::{parse_document, patch_config, patch_face, MemoryConfig, MemoryFace};
use serde_json::Value;

#[test]
fn native_document_codec_matches_frontend_utf8_golden_corpus() {
    let cases: Vec<Value> = serde_json::from_str(include_str!(
        "../../../tests/fixtures/note-memory/document-corpus.json"
    ))
    .unwrap();
    assert_eq!(cases.len(), 28);
    for case in cases {
        let parsed = parse_document(case["source"].as_str().unwrap());
        let actual = serde_json::json!({
            "front": parsed.front,
            "back": parsed.back,
            "config": parsed.config,
            "pageId": parsed.page_id,
            "issues": parsed.issues,
            "ranges": parsed.ranges,
        });
        assert_eq!(actual, case["expected"], "{}", case["name"]);
    }
}

#[test]
fn native_patches_match_frontend_without_rewriting_other_bytes() {
    let cases: Vec<Value> = serde_json::from_str(include_str!(
        "../../../tests/fixtures/note-memory/patch-corpus.json"
    ))
    .unwrap();
    assert_eq!(cases.len(), 9);
    for case in cases {
        let source = case["source"].as_str().unwrap();
        let actual = if case.get("config").is_some() {
            let config: MemoryConfig = serde_json::from_value(case["config"].clone()).unwrap();
            patch_config(source, &config)
        } else {
            let face: MemoryFace = serde_json::from_value(case["face"].clone()).unwrap();
            patch_face(
                source,
                face,
                case["content"].as_str().unwrap(),
                case["createBack"].as_bool().unwrap_or(false),
            )
        };
        assert_eq!(
            actual.unwrap(),
            case["expected"].as_str().unwrap(),
            "{}",
            case["name"]
        );
    }
}

#[test]
fn native_patches_fail_closed_for_ambiguous_or_future_sources() {
    let config = MemoryConfig::inline(true);
    for source in [
        "# Article\n<!-- FLASHCARD:BACK -->\nOne\n<!-- FLASHCARD:BACK -->\nTwo",
        "---\n_memnova_learning_version: 2\n---\n# Article",
    ] {
        assert!(patch_config(source, &config).is_err());
        assert!(patch_face(source, MemoryFace::Back, "Changed", false).is_err());
    }
    assert!(patch_face(
        "# Front\n<!-- FLASHCARD:BACK -->\nBack",
        MemoryFace::Front,
        "```html\nUnclosed",
        false
    )
    .is_err());
}
