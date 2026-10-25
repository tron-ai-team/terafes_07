package com.tronai;

import com.tronai.ai.AiProvider;
import com.tronai.storage.ObjectStorageService;
import com.tronai.system.HealthController;
import org.junit.jupiter.api.Test;
import javax.sql.DataSource;
import java.sql.Connection;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class ReleaseReadinessTest {
    @Test
    void externalAiOutageDoesNotInvalidateHealthyRelease() throws Exception {
        DataSource database = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(database.getConnection()).thenReturn(connection);
        when(connection.isValid(2)).thenReturn(true);
        ObjectStorageService storage = mock(ObjectStorageService.class);
        when(storage.isAvailable()).thenReturn(true);
        AiProvider ai = mock(AiProvider.class);
        HealthController controller = new HealthController(database, ai, null, null, null, null, storage, null, null);
        assertThat(controller.releaseReadiness().getStatusCode().value()).isEqualTo(200);
        verifyNoInteractions(ai);
        when(connection.isValid(2)).thenReturn(false);
        assertThat(controller.releaseReadiness().getStatusCode().value()).isEqualTo(503);
    }

    @Test
    void missingPersistenceIsNotReady() {
        HealthController controller = new HealthController(null, null, null, null, null, null, null, null, null);
        assertThat(controller.releaseReadiness().getStatusCode().value()).isEqualTo(503);
    }
}
