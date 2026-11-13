package com.tronai.auth;

import com.tronai.user.User;
import com.tronai.user.UserRepository;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;

/**
 * Validates Bearer JWT and rejects suspended/disabled accounts even if the access token
 * has not yet expired (suspension revocation policy).
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserRepository users;

    public JwtAuthenticationFilter(JwtService jwtService, UserRepository users) {
        this.jwtService = jwtService;
        this.users = users;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (StringUtils.hasText(authHeader) && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7).trim();
            Claims claims = jwtService.parseAndValidateToken(token);

            if (claims != null) {
                try {
                    Long userId = Long.parseLong(claims.getSubject());
                    Optional<User> dbUser = users.findById(userId);
                    if (dbUser.isEmpty()
                            || !dbUser.get().isEnabled()
                            || dbUser.get().getSuspendedAt() != null
                            || dbUser.get().getDeletedAt() != null) {
                        SecurityContextHolder.clearContext();
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                        response.getWriter().write("{\"detail\":\"Account is disabled\"}");
                        return;
                    }
                    User u = dbUser.get();
                    String email = claims.get("email", String.class);
                    String role = u.getRole() != null ? u.getRole() : claims.get("role", String.class);
                    String displayName = u.getDisplayName() != null ? u.getDisplayName() : claims.get("displayName", String.class);

                    UserPrincipal principal = UserPrincipal.builder()
                            .id(userId)
                            .email(email != null ? email : u.getEmail())
                            .role(role != null ? role : "USER")
                            .displayName(displayName)
                            .build();

                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            principal,
                            null,
                            principal.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                } catch (Exception e) {
                    SecurityContextHolder.clearContext();
                }
            } else {
                SecurityContextHolder.clearContext();
            }
        } else {
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}
