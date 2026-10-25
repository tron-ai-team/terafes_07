package com.tronai.agentengine;

import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Routes user goals to native OpenCode (coding) or OpenClaw (automation/browser).
 * Does not plan tools — only selects the engine.
 */
@Component
public class NativeAgentRouter {

    public enum RouteKind {
        CODING,
        AUTOMATION
    }

    public RouteKind route(String goal) {
        if (goal == null || goal.isBlank()) {
            return RouteKind.CODING;
        }
        String g = goal.toLowerCase(Locale.ROOT);
        if (g.contains("browser")
                || g.contains("screenshot")
                || g.contains("open http")
                || g.contains("open https")
                || g.contains("navigate")
                || g.contains("scrape")
                || g.contains("web page")
                || g.contains("webpage")
                || (g.contains("open") && (g.contains("website") || g.contains("url")))
                || g.contains("playwright")
                || g.contains("openclaw")) {
            return RouteKind.AUTOMATION;
        }
        return RouteKind.CODING;
    }
}
