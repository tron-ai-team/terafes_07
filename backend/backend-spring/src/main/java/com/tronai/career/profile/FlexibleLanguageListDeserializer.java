package com.tronai.career.profile;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.JsonNode;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Accepts legacy string[] languages and structured language objects.
 */
public class FlexibleLanguageListDeserializer extends JsonDeserializer<List<Map<String, Object>>> {

    @Override
    public List<Map<String, Object>> deserialize(JsonParser p, DeserializationContext ctxt) throws IOException {
        if (p.currentToken() == JsonToken.VALUE_NULL) {
            return null;
        }
        JsonNode node = p.getCodec().readTree(p);
        if (node == null || node.isNull()) {
            return null;
        }
        if (!node.isArray()) {
            throw ctxt.weirdStringException(node.asText(), List.class, "languages must be a JSON array");
        }
        List<Map<String, Object>> out = new ArrayList<>();
        for (JsonNode item : node) {
            if (item == null || item.isNull()) continue;
            if (item.isTextual()) {
                String language = item.asText().trim();
                if (language.isEmpty()) continue;
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("language", language);
                m.put("proficiency", "");
                m.put("verified", false);
                out.add(m);
            } else if (item.isObject()) {
                Map<String, Object> m = new LinkedHashMap<>();
                item.fields().forEachRemaining(e -> m.put(e.getKey(), toJava(e.getValue())));
                if (m.get("language") == null && m.get("name") != null) {
                    m.put("language", String.valueOf(m.get("name")));
                }
                if (m.get("language") != null && !String.valueOf(m.get("language")).isBlank()) {
                    out.add(m);
                }
            }
        }
        return out;
    }

    private static Object toJava(JsonNode n) {
        if (n == null || n.isNull()) return null;
        if (n.isBoolean()) return n.asBoolean();
        if (n.isNumber()) return n.numberValue();
        if (n.isTextual()) return n.asText();
        return n.toString();
    }
}
