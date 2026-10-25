package com.tronai.desktop.terminal;

import com.tronai.desktop.protocol.ProtocolMessage;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class MavenWrapperTest {

    @Test
    void runsMavenThroughTheProjectWrapper(@TempDir Path workspace) throws Exception {
        Path spring = Path.of("..", "backend", "backend-spring").toAbsolutePath().normalize();
        Path wrapper = spring.resolve("mvnw.cmd");
        Path properties = spring.resolve(".mvn").resolve("wrapper").resolve("maven-wrapper.properties");
        assertThat(Files.isRegularFile(wrapper)).isTrue();
        assertThat(Files.isRegularFile(properties)).isTrue();
        Files.copy(wrapper, workspace.resolve("mvnw.cmd"));
        Files.createDirectories(workspace.resolve(".mvn").resolve("wrapper"));
        Files.copy(properties, workspace.resolve(".mvn").resolve("wrapper").resolve("maven-wrapper.properties"));
        Files.writeString(workspace.resolve("pom.xml"), """
                <project>
                  <modelVersion>4.0.0</modelVersion>
                  <groupId>com.tronai</groupId>
                  <artifactId>tron-maven-smoke</artifactId>
                  <version>1.0</version>
                </project>
                """);

        OsProcessRunner runner = new OsProcessRunner();
        ProtocolMessage.Result result = runner.run(java.util.List.of("mvn", "test"), workspace, 180_000, null);
        assertThat(result.getStdout() + result.getStderr()).contains("BUILD SUCCESS");
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getExitCode()).isZero();
    }
}
