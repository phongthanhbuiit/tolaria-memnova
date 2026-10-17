use serde_json::Value;

// JSON numbers cross a JavaScript boundary. Keep an unchanged projection of a
// legacy integer that JavaScript cannot represent exactly, including opaque data.
pub(super) fn preserve_legacy_numbers(incoming: &mut Value, original: &Value) {
    match (incoming, original) {
        (Value::Object(next), Value::Object(previous)) => {
            for (key, value) in next {
                if let Some(old) = previous.get(key) {
                    preserve_legacy_numbers(value, old);
                }
            }
        }
        (Value::Array(next), Value::Array(previous)) => {
            for (value, old) in next.iter_mut().zip(previous) {
                preserve_legacy_numbers(value, old);
            }
        }
        (next, Value::Number(old))
            if (old.is_i64() || old.is_u64())
                && old
                    .as_f64()
                    .is_some_and(|number| number.abs() > 9_007_199_254_740_991.0)
                && next.is_number()
                && next.as_f64() == old.as_f64() =>
        {
            *next = Value::Number(old.clone());
        }
        _ => {}
    }
}
