package com.credx.keyforge.config;

import com.credx.keyforge.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Ensures schema constraints and columns are up to date on Supabase
 * and removes legacy dummy/seeded accounts and organizations.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        log.info("Running database migration and cleanup...");

        try {
            // Update role constraint for developer/provider separation
            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            jdbcTemplate.execute("UPDATE users SET role = 'DEVELOPER' WHERE role NOT IN ('DEVELOPER', 'PROVIDER', 'ADMIN')");
            jdbcTemplate.execute("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('DEVELOPER', 'PROVIDER', 'ADMIN'))");

            // Ensure profile columns exist in Supabase users table
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_stack VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS github_url VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS use_case VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_name VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS website_url VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS provider_type VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS support_email VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS base_api_url VARCHAR(255)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_scheme VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS hosting_region VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS default_rate_limit INT");
            jdbcTemplate.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS sla_tier VARCHAR(100)");
            jdbcTemplate.execute("ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS service_id VARCHAR(36)");
            log.info("Users and ApiKeys schema verified and updated successfully");
        } catch (Exception e) {
            log.warn("Schema constraint/column update: {}", e.getMessage());
        }

        try {
            // Remove legacy dummy organizations, keys, and accounts (Acme Corp, Northwind, etc.)
            jdbcTemplate.execute("DELETE FROM api_key_usage_logs WHERE api_key_id IN (SELECT id FROM api_keys WHERE project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT id FROM organizations WHERE slug IN ('acme-corp', 'northwind-traders'))))");
            jdbcTemplate.execute("DELETE FROM api_key_scopes WHERE api_key_id IN (SELECT id FROM api_keys WHERE project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT id FROM organizations WHERE slug IN ('acme-corp', 'northwind-traders'))))");
            jdbcTemplate.execute("DELETE FROM audit_logs WHERE organization_id IN (SELECT id FROM organizations WHERE slug IN ('acme-corp', 'northwind-traders'))");
            jdbcTemplate.execute("DELETE FROM api_keys WHERE project_id IN (SELECT id FROM projects WHERE organization_id IN (SELECT id FROM organizations WHERE slug IN ('acme-corp', 'northwind-traders')))");
            jdbcTemplate.execute("DELETE FROM projects WHERE organization_id IN (SELECT id FROM organizations WHERE slug IN ('acme-corp', 'northwind-traders'))");
            jdbcTemplate.execute("DELETE FROM organization_memberships WHERE organization_id IN (SELECT id FROM organizations WHERE slug IN ('acme-corp', 'northwind-traders'))");
            jdbcTemplate.execute("DELETE FROM organizations WHERE slug IN ('acme-corp', 'northwind-traders')");
            jdbcTemplate.execute("DELETE FROM organization_memberships WHERE user_id IN (SELECT id FROM users WHERE email IN ('alice@acme.dev', 'carol@northwind.dev', 'bob@acme.dev', 'admin@credx.dev'))");
            jdbcTemplate.execute("DELETE FROM users WHERE email IN ('alice@acme.dev', 'carol@northwind.dev', 'bob@acme.dev', 'admin@credx.dev')");
            log.info("Removed all legacy demo accounts and organizations from Supabase");
        } catch (Exception e) {
            log.warn("Cleanup of legacy demo accounts: {}", e.getMessage());
        }
    }
}
