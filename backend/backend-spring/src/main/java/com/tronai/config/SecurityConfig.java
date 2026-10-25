package com.tronai.config;

import com.tronai.auth.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Spring Security configuration for TRON AI.
 * Enforces stateless JWT authentication, BCrypt password hashing, and endpoint authorization rules.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final CorsConfigurationSource corsConfigurationSource;
    private final org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository;
    private final com.tronai.auth.oauth2.HttpCookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository;
    private final com.tronai.auth.oauth2.OAuth2AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler;
    private final com.tronai.auth.oauth2.OAuth2AuthenticationFailureHandler oauth2AuthenticationFailureHandler;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter,
                          CorsConfigurationSource corsConfigurationSource,
                          org.springframework.security.oauth2.client.registration.ClientRegistrationRepository clientRegistrationRepository,
                          com.tronai.auth.oauth2.HttpCookieOAuth2AuthorizationRequestRepository cookieAuthorizationRequestRepository,
                          com.tronai.auth.oauth2.OAuth2AuthenticationSuccessHandler oauth2AuthenticationSuccessHandler,
                          com.tronai.auth.oauth2.OAuth2AuthenticationFailureHandler oauth2AuthenticationFailureHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.corsConfigurationSource = corsConfigurationSource;
        this.clientRegistrationRepository = clientRegistrationRepository;
        this.cookieAuthorizationRequestRepository = cookieAuthorizationRequestRepository;
        this.oauth2AuthenticationSuccessHandler = oauth2AuthenticationSuccessHandler;
        this.oauth2AuthenticationFailureHandler = oauth2AuthenticationFailureHandler;
    }


    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityContext(sc -> sc.securityContextRepository(
                        new org.springframework.security.web.context.RequestAttributeSecurityContextRepository()
                ))
                .cors(cors -> cors.configurationSource(corsConfigurationSource))
                .csrf(csrf -> csrf.disable())
                // TRON uses /api/v1/auth/logout (cookie revoke). Disable default /logout filter
                // so OAuth2 login does not intercept or conflict with the API logout contract.
                .logout(logout -> logout.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"detail\":\"Authentication required\"}");
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"detail\":\"Access denied\"}");
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        // Preflight requests
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // Health and System Info
                        .requestMatchers("/health", "/health/ready", "/actuator/health", "/actuator/info").permitAll()

                        // Public Auth Endpoints & OAuth2
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/providers").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout").permitAll()
                        .requestMatchers("/oauth2/authorization/**", "/login/oauth2/code/**").permitAll()
                        .requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()

                        // Public AI Models catalog & AI Profiles
                        .requestMatchers("/api/v1/models", "/api/v1/models/**").permitAll()
                        .requestMatchers("/api/v1/ai-profiles", "/api/v1/ai-profiles/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/ai/modes", "/api/v1/ai/models").permitAll()

                        // Deliberate ephemeral-audio exception: clips are cryptographically random UUIDs expiring after 10 mins
                        .requestMatchers("/api/v1/voice/audio/**").permitAll()

                        // OpenAPI & Swagger UI
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()

                        // Desktop agent starts unauthenticated, then presents a one-time poll secret.
                        // The socket itself is rejected unless the device credential is valid.
                        .requestMatchers(HttpMethod.POST, "/api/v1/desktop-agents/pairing-requests", "/api/v1/desktop-agents/link-requests").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/desktop-agents/pairing-requests/**", "/api/v1/desktop-agents/link-requests/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/desktop-agents/link-requests/*/poll").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/desktop-agents/link-requests/*/authorize").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/desktop-agents/download-info").permitAll()
                        .requestMatchers("/api/v1/desktop-agent/ws").permitAll()

                        // Admin Control Center — role enforced by @PreAuthorize(ADMIN|OWNER)
                        .requestMatchers("/api/v1/admin/**").hasAnyRole("ADMIN", "OWNER")

                        // All other APIs require authentication (e.g. GET /api/v1/auth/me)
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        if (clientRegistrationRepository.findByRegistrationId("google") != null) {
            http.oauth2Login(oauth2 -> oauth2
                    .clientRegistrationRepository(clientRegistrationRepository)
                    .authorizationEndpoint(authEndpoint -> authEndpoint
                            .authorizationRequestRepository(cookieAuthorizationRequestRepository)
                    )
                    .successHandler(oauth2AuthenticationSuccessHandler)
                    .failureHandler(oauth2AuthenticationFailureHandler)
            );
        }

        return http.build();
    }
}
