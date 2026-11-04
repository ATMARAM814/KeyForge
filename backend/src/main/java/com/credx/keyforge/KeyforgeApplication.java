package com.credx.keyforge;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@SpringBootApplication
@EnableScheduling
public class KeyforgeApplication {

    public static void main(String[] args) {
        loadDotEnv();
        SpringApplication.run(KeyforgeApplication.class, args);
    }

    /**
     * Automatically loads .env file into System properties so developers can run
     * "java -jar target/keyforge.jar" or "mvnw spring-boot:run" in ANY terminal
     * (Command Prompt, PowerShell, Git Bash, Linux/Mac shell) without needing
     * special PowerShell scripts or manual environment variable exports.
     */
    private static void loadDotEnv() {
        Path[] searchPaths = new Path[]{
                Path.of(".env"),
                Path.of("backend", ".env"),
                Path.of("..", ".env")
        };

        for (Path path : searchPaths) {
            if (Files.exists(path) && Files.isRegularFile(path)) {
                try {
                    List<String> lines = Files.readAllLines(path);
                    for (String line : lines) {
                        line = line.trim();
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }
                        int separatorIndex = line.indexOf('=');
                        if (separatorIndex > 0) {
                            String key = line.substring(0, separatorIndex).trim();
                            String value = line.substring(separatorIndex + 1).trim();
                            // Do not overwrite existing system properties or OS environment variables
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, value);
                            }
                        }
                    }
                    System.out.println("[KeyForge] Loaded environment configuration from: " + path.toAbsolutePath());
                    break;
                } catch (IOException e) {
                    System.err.println("[KeyForge] Warning: could not read .env at " + path + ": " + e.getMessage());
                }
            }
        }
    }
}

