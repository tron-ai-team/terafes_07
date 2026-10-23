package com.tronai.desktop.app;

import com.tronai.desktop.security.CredentialStore;
import javafx.animation.KeyFrame;
import javafx.animation.PauseTransition;
import javafx.animation.Timeline;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Alert;
import javafx.scene.control.Button;
import javafx.scene.control.ButtonBar;
import javafx.scene.control.ButtonType;
import javafx.scene.control.CheckBox;
import javafx.scene.control.Dialog;
import javafx.scene.control.Label;
import javafx.scene.control.ListView;
import javafx.scene.control.ProgressBar;
import javafx.scene.control.ScrollPane;
import javafx.scene.control.TextField;
import javafx.scene.input.Clipboard;
import javafx.scene.input.ClipboardContent;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.Priority;
import javafx.scene.layout.Region;
import javafx.scene.layout.VBox;
import javafx.stage.DirectoryChooser;
import javafx.stage.Modality;
import javafx.stage.Stage;
import javafx.util.Duration;

import java.awt.AWTException;
import java.awt.Graphics2D;
import java.awt.Image;
import java.awt.MenuItem;
import java.awt.PopupMenu;
import java.awt.RenderingHints;
import java.awt.SystemTray;
import java.awt.TrayIcon;
import java.awt.image.BufferedImage;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * TRON Desktop Agent — Modern Light Design Companion.
 * Fully aligned with Apple / TRON futuristic aesthetics, clean visual hierarchy,
 * non-contradictory state management, and clear user actions.
 */
public class DesktopAgentApp extends Application {

    private static SingleInstanceManager singleInstanceManager;

    private AgentRuntime runtime;
    private CredentialStore store;
    private Stage stage;

    // Header components
    private Label headerConnectionBadge;
    private Label headerDeviceLabel;

    // User action required banner
    private VBox userActionCard;
    private Label userActionDetail;

    // Primary Card container & sub-views
    private VBox primaryCard;
    private VBox primaryUnconnectedBox;
    private VBox primaryBrowserWaitingBox;
    private Label browserWaitingCountdownLabel;
    private Label browserWaitingUrlLabel;
    private ProgressBar browserWaitingProgressBar;
    private VBox primaryBrowserExpiredBox;
    private VBox primaryCoreOfflineBox;
    private Label coreOfflineDetailLabel;
    private VBox primaryPairingCodeBox;
    private Label pairingCodeDisplay;
    private Label pairingCountdownLabel;
    private Label pairingWaitingLabel;
    private Button copyCodeBtn;
    private Button retryCodeBtn;
    private Button refreshCodeBtn;
    private Button repairPairingBtn;
    private Button resetIdentityBtn;
    private VBox primaryConnectedBox;
    private Label connectedDeviceVal;
    private Label connectedWorkspaceVal;
    private Label connectedCoreVal;
    private Timeline countdownTimeline;
    private final AtomicInteger remainingSeconds = new AtomicInteger(0);

    // Secondary Cards: Task, Browser, Security
    private Label taskStatusBadge;
    private Label taskSummaryLabel;
    private Label taskDetailLabel;
    private HBox taskActionBox;
    private Button taskPauseBtn;
    private Button taskTakeControlBtn;
    private Button taskStopBtn;

    private Label browserStateBadge;
    private Label browserSummaryLabel;
    private Label browserDetailLabel;
    private HBox browserActionBox;
    private Button openBrowserBtn;
    private Button resumeAgentBtn;
    private Button closeBrowserBtn;

    // Expandable: Advanced Details
    private VBox advancedDetailsContent;
    private Button advancedDetailsToggleBtn;
    private Label advDeviceUuidVal;
    private Label advAgentVersionVal;
    private Label advCoreUrlVal;
    private Label advHeartbeatVal;
    private Label advProtocolStatusVal;
    private Label advBrowserStateVal;
    private Label advWorkspaceVal;
    private Instant lastHeartbeatTime;

    // Expandable: Activity Log
    private VBox logContentBox;
    private Button logToggleBtn;
    private ListView<String> activityListView;
    private Label eventCountBadge;

    // System Tray
    private TrayIcon trayIcon;
    private MenuItem trayStatusItem;

    @Override
    public void init() throws Exception {
        if (singleInstanceManager == null) {
            singleInstanceManager = new SingleInstanceManager();
            if (!singleInstanceManager.acquireOrSignal()) {
                System.out.println("[TRON Desktop Agent] Existing instance detected. Activating existing window.");
                Platform.exit();
                System.exit(0);
            }
        }
    }

    @Override
    public void start(Stage primaryStage) {
        this.stage = primaryStage;
        this.store = new CredentialStore(CredentialStore.defaultFile());
        try {
            this.store.loadOrCreate();
        } catch (Exception e) {
            System.err.println("[TRON Desktop Agent] Error initializing identity store: " + e.getMessage());
        }

        if (singleInstanceManager != null) {
            singleInstanceManager.setOnShowRequested(() -> Platform.runLater(() -> restoreWindow(primaryStage)));
        }

        buildUi(primaryStage);
        installTray(primaryStage);
        watchShowRequest(primaryStage);

        startHeartbeatTicker();
        startRuntime();

        if (Boolean.getBoolean("tron.ui.smoke") || "true".equalsIgnoreCase(System.getenv("TRON_UI_SMOKE"))) {
            Platform.runLater(this::shutdownAndExit);
        }
    }

    private void buildUi(Stage primaryStage) {
        BorderPane root = new BorderPane();
        root.getStyleClass().add("root");

        // Top Header
        root.setTop(buildHeader());

        // Center Scroll Content
        VBox contentBox = new VBox(16);
        contentBox.setPadding(new Insets(20, 24, 20, 24));

        // 1. User Action Required Banner (hidden by default)
        userActionCard = buildUserActionCard();
        userActionCard.setVisible(false);
        userActionCard.setManaged(false);
        contentBox.getChildren().add(userActionCard);

        // 2. Main Primary Status Card
        primaryCard = buildPrimaryCard();
        contentBox.getChildren().add(primaryCard);

        // 3. Secondary Compact Cards (Task, Browser, Security in 3-column row)
        contentBox.getChildren().add(buildSecondarySections());

        // 4. Expandable: Advanced Details
        contentBox.getChildren().add(buildAdvancedDetailsSection());

        // 5. Expandable: Activity Log
        contentBox.getChildren().add(buildActivityLogSection());

        ScrollPane scroll = new ScrollPane(contentBox);
        scroll.setFitToWidth(true);
        scroll.getStyleClass().add("main-scroll");
        root.setCenter(scroll);

        // Footer
        root.setBottom(buildFooter());

        Scene scene = new Scene(root, 980, 700);
        try {
            String css = getClass().getResource("/com/tronai/desktop/ui/tron-desktop.css").toExternalForm();
            scene.getStylesheets().add(css);
        } catch (Exception ignored) {
        }

        primaryStage.setTitle("TRON Desktop Agent");
        primaryStage.setMinWidth(880);
        primaryStage.setMinHeight(600);
        primaryStage.setScene(scene);

        primaryStage.setOnCloseRequest(event -> {
            event.consume();
            handleCloseRequest();
        });

        restoreWindow(primaryStage);
    }

    private HBox buildHeader() {
        HBox header = new HBox(14);
        header.getStyleClass().add("header-bar");
        header.setAlignment(Pos.CENTER_LEFT);

        // Modern Logo
        Label logo = new Label("T");
        logo.setStyle("-fx-background-color: #0284c7; -fx-text-fill: white; -fx-font-weight: 900; -fx-font-size: 15px; -fx-background-radius: 8px; -fx-padding: 4 10 4 10;");

        VBox titleBox = new VBox(1);
        Label title = new Label("TRON Desktop Agent");
        title.getStyleClass().add("header-title");
        headerDeviceLabel = new Label(AgentRuntime.hostname());
        headerDeviceLabel.getStyleClass().add("header-subtitle");
        titleBox.getChildren().addAll(title, headerDeviceLabel);

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        headerConnectionBadge = new Label("● OFFLINE");
        headerConnectionBadge.getStyleClass().addAll("badge", "badge-offline");

        Button settingsBtn = new Button("⚙ Settings");
        settingsBtn.setOnAction(e -> showConnectionSettingsDialog());

        header.getChildren().addAll(logo, titleBox, spacer, headerConnectionBadge, settingsBtn);
        return header;
    }

    private VBox buildUserActionCard() {
        VBox card = new VBox(10);
        card.getStyleClass().add("action-required-card");

        HBox top = new HBox(8);
        top.setAlignment(Pos.CENTER_LEFT);
        Label icon = new Label("⚠️");
        icon.setStyle("-fx-font-size: 16px;");
        Label title = new Label("USER ACTION REQUIRED");
        title.getStyleClass().add("action-required-title");
        top.getChildren().addAll(icon, title);

        userActionDetail = new Label(
                "This website requires manual interaction, login, MFA, or CAPTCHA.\n" +
                "Complete the action manually in the browser. Do not type passwords into TRON chat."
        );
        userActionDetail.getStyleClass().add("action-required-text");
        userActionDetail.setWrapText(true);

        HBox btnBox = new HBox(10);
        Button openBrowser = new Button("🌐 Open / Focus Browser");
        openBrowser.getStyleClass().add("btn-warning");
        openBrowser.setOnAction(e -> {
            if (runtime != null) runtime.openBrowser(null);
        });

        Button resume = new Button("▶ Resume Agent");
        resume.getStyleClass().add("btn-primary");
        resume.setOnAction(e -> {
            if (runtime != null) runtime.resumeTask();
        });

        btnBox.getChildren().addAll(openBrowser, resume);
        card.getChildren().addAll(top, userActionDetail, btnBox);
        return card;
    }

    private VBox buildPrimaryCard() {
        VBox card = new VBox(14);
        card.getStyleClass().add("card-primary");

        // 1. UNCONNECTED VIEW
        primaryUnconnectedBox = new VBox(12);
        primaryUnconnectedBox.setAlignment(Pos.CENTER_LEFT);

        Label connectTitle = new Label("Connect this computer to TRON");
        connectTitle.setStyle("-fx-font-size: 18px; -fx-font-weight: 800; -fx-text-fill: #0f172a;");

        Label connectDesc = new Label("Securely connect this PC to your TRON account to execute coding tasks in your local workspace.");
        connectDesc.setStyle("-fx-text-fill: #64748b; -fx-font-size: 13px;");

        HBox connectBtnBox = new HBox(12);
        connectBtnBox.setAlignment(Pos.CENTER_LEFT);

        Button continueWithTronBtn = new Button("Continue with TRON");
        continueWithTronBtn.getStyleClass().add("btn-hero");
        continueWithTronBtn.setOnAction(e -> {
            if (runtime != null) {
                applyPairingUiState(AgentRuntime.PairingUiState.BROWSER_WAITING, null, 600, "Starting browser authorization...");
                runtime.startBrowserLinkFlow();
            }
        });

        Label orText = new Label("or");
        orText.setStyle("-fx-text-fill: #94a3b8; -fx-font-size: 13px; -fx-font-weight: 600;");

        Button pairUsingCodeBtn = new Button("Pair using a code");
        pairUsingCodeBtn.setOnAction(e -> {
            if (runtime != null) {
                runtime.startPairingCodeFlow();
            }
        });

        connectBtnBox.getChildren().addAll(continueWithTronBtn, orText, pairUsingCodeBtn);
        primaryUnconnectedBox.getChildren().addAll(connectTitle, connectDesc, connectBtnBox);

        // 2. WAITING FOR BROWSER AUTHORIZATION VIEW
        primaryBrowserWaitingBox = new VBox(12);
        primaryBrowserWaitingBox.setVisible(false);
        primaryBrowserWaitingBox.setManaged(false);

        Label waitingTitle = new Label("Waiting for authorization");
        waitingTitle.setStyle("-fx-font-size: 18px; -fx-font-weight: 800; -fx-text-fill: #0284c7;");

        Label waitingDesc = new Label("Your browser has been opened. Authorize this computer in TRON to continue.");
        waitingDesc.setStyle("-fx-text-fill: #475569; -fx-font-size: 13px;");

        browserWaitingProgressBar = new ProgressBar(-1);
        browserWaitingProgressBar.setPrefWidth(380);
        browserWaitingProgressBar.getStyleClass().add("progress-bar");

        browserWaitingCountdownLabel = new Label("Expires in 10:00");
        browserWaitingCountdownLabel.getStyleClass().add("pairing-countdown");

        browserWaitingUrlLabel = new Label("");
        browserWaitingUrlLabel.getStyleClass().add("mono-path");
        browserWaitingUrlLabel.setWrapText(true);
        browserWaitingUrlLabel.setVisible(false);
        browserWaitingUrlLabel.setManaged(false);

        HBox waitingBtnBox = new HBox(10);
        Button openBrowserAgainBtn = new Button("Open Browser Again");
        openBrowserAgainBtn.getStyleClass().add("btn-primary");
        openBrowserAgainBtn.setOnAction(e -> {
            if (runtime != null) runtime.openBrowserAgain();
        });

        Button cancelWaitingBtn = new Button("Cancel");
        cancelWaitingBtn.setOnAction(e -> {
            if (runtime != null) runtime.cancelBrowserLink();
            applyPairingUiState(AgentRuntime.PairingUiState.UNCONNECTED, null, 0, null);
        });

        waitingBtnBox.getChildren().addAll(openBrowserAgainBtn, cancelWaitingBtn);
        primaryBrowserWaitingBox.getChildren().addAll(waitingTitle, waitingDesc, browserWaitingProgressBar, browserWaitingCountdownLabel, browserWaitingUrlLabel, waitingBtnBox);

        // 3. BROWSER EXPIRED VIEW
        primaryBrowserExpiredBox = new VBox(12);
        primaryBrowserExpiredBox.setVisible(false);
        primaryBrowserExpiredBox.setManaged(false);

        Label expiredTitle = new Label("Authorization expired");
        expiredTitle.setStyle("-fx-font-size: 16px; -fx-font-weight: 800; -fx-text-fill: #dc2626;");

        Label expiredDesc = new Label("The browser authorization request timed out before completion.");
        expiredDesc.setStyle("-fx-text-fill: #64748b; -fx-font-size: 13px;");

        HBox expiredBtnBox = new HBox(10);
        Button tryAgainBtn = new Button("Try Again");
        tryAgainBtn.getStyleClass().add("btn-primary");
        tryAgainBtn.setOnAction(e -> {
            if (runtime != null) {
                applyPairingUiState(AgentRuntime.PairingUiState.BROWSER_WAITING, null, 600, "Starting browser authorization...");
                runtime.startBrowserLinkFlow();
            }
        });

        Button cancelExpiredBtn = new Button("Cancel");
        cancelExpiredBtn.setOnAction(e -> {
            if (runtime != null) runtime.cancelBrowserLink();
            applyPairingUiState(AgentRuntime.PairingUiState.UNCONNECTED, null, 0, null);
        });

        expiredBtnBox.getChildren().addAll(tryAgainBtn, cancelExpiredBtn);
        primaryBrowserExpiredBox.getChildren().addAll(expiredTitle, expiredDesc, expiredBtnBox);

        // 4. CORE OFFLINE VIEW
        primaryCoreOfflineBox = new VBox(12);
        primaryCoreOfflineBox.setVisible(false);
        primaryCoreOfflineBox.setManaged(false);

        Label offlineTitle = new Label("TRON Core is offline");
        offlineTitle.setStyle("-fx-font-size: 16px; -fx-font-weight: 800; -fx-text-fill: #dc2626;");

        coreOfflineDetailLabel = new Label("Cannot reach TRON Core backend on localhost:8080. Verify that the backend is running.");
        coreOfflineDetailLabel.setStyle("-fx-text-fill: #64748b; -fx-font-size: 13px;");

        HBox offlineBtnBox = new HBox(10);
        Button retryOfflineBtn = new Button("🔄 Retry Connection");
        retryOfflineBtn.getStyleClass().add("btn-primary");
        retryOfflineBtn.setOnAction(e -> {
            if (runtime != null) runtime.retryNow();
        });

        Button settingsOfflineBtn = new Button("⚙ Settings");
        settingsOfflineBtn.setOnAction(e -> showConnectionSettingsDialog());

        offlineBtnBox.getChildren().addAll(retryOfflineBtn, settingsOfflineBtn);
        primaryCoreOfflineBox.getChildren().addAll(offlineTitle, coreOfflineDetailLabel, offlineBtnBox);

        // 5. PAIRING CODE FALLBACK VIEW (Only shown when requested)
        primaryPairingCodeBox = new VBox(12);
        primaryPairingCodeBox.setVisible(false);
        primaryPairingCodeBox.setManaged(false);

        Label pairCodeTitle = new Label("Pairing Code");
        pairCodeTitle.setStyle("-fx-font-size: 16px; -fx-font-weight: 800; -fx-text-fill: #0f172a;");

        Label pairCodeDesc = new Label("Enter this code in TRON Web (Workspace → Devices → Pair Device)");
        pairCodeDesc.setStyle("-fx-text-fill: #64748b; -fx-font-size: 12px;");

        VBox codeBox = new VBox(6);
        codeBox.getStyleClass().add("pairing-code-box");
        pairingCodeDisplay = new Label("···-···");
        pairingCodeDisplay.getStyleClass().add("pairing-code-text");

        pairingCountdownLabel = new Label("Requesting pairing code from Core...");
        pairingCountdownLabel.getStyleClass().add("pairing-countdown");

        pairingWaitingLabel = new Label("");
        pairingWaitingLabel.setWrapText(true);
        pairingWaitingLabel.setStyle("-fx-text-fill: #b45309; -fx-font-size: 11px;");
        pairingWaitingLabel.setVisible(false);
        pairingWaitingLabel.setManaged(false);

        codeBox.getChildren().addAll(pairingCodeDisplay, pairingCountdownLabel, pairingWaitingLabel);

        HBox pBtnBox = new HBox(10);
        copyCodeBtn = new Button("📋 Copy Code");
        copyCodeBtn.getStyleClass().add("btn-primary");
        copyCodeBtn.setDisable(true);
        copyCodeBtn.setOnAction(e -> copyPairingCode());

        retryCodeBtn = new Button("🔄 Retry");
        retryCodeBtn.setOnAction(e -> {
            applyPairingUiState(AgentRuntime.PairingUiState.REQUESTING, null, 0, "Retrying pairing request...");
            if (runtime != null) runtime.refreshPairingCode();
        });

        refreshCodeBtn = new Button("🔄 Refresh");
        refreshCodeBtn.setOnAction(e -> {
            applyPairingUiState(AgentRuntime.PairingUiState.REQUESTING, null, 0, "Requesting new code...");
            if (runtime != null) runtime.refreshPairingCode();
        });

        Button openWebFromPairBtn = new Button("↗ Open Web");
        openWebFromPairBtn.setOnAction(e -> openConsole());

        Button backToContinueBtn = new Button("← Back");
        backToContinueBtn.setOnAction(e -> {
            if (runtime != null) runtime.cancelBrowserLink();
            applyPairingUiState(AgentRuntime.PairingUiState.UNCONNECTED, null, 0, null);
        });

        repairPairingBtn = new Button("Repair Pairing");
        repairPairingBtn.getStyleClass().add("btn-primary");
        repairPairingBtn.setVisible(false);
        repairPairingBtn.setManaged(false);
        repairPairingBtn.setOnAction(e -> openConsole());

        resetIdentityBtn = new Button("Reset Local Identity");
        resetIdentityBtn.getStyleClass().add("btn-danger");
        resetIdentityBtn.setVisible(false);
        resetIdentityBtn.setManaged(false);
        resetIdentityBtn.setOnAction(e -> confirmResetLocalIdentity());

        pBtnBox.getChildren().addAll(copyCodeBtn, refreshCodeBtn, openWebFromPairBtn, backToContinueBtn, repairPairingBtn, resetIdentityBtn, retryCodeBtn);
        primaryPairingCodeBox.getChildren().addAll(pairCodeTitle, pairCodeDesc, codeBox, pBtnBox);

        // 6. CONNECTED VIEW
        primaryConnectedBox = new VBox(12);
        boolean initialPaired = store.isPaired();

        HBox connectedHeader = new HBox(10);
        connectedHeader.setAlignment(Pos.CENTER_LEFT);
        Label connectedTitle = new Label("✓ Connected to TRON");
        connectedTitle.setStyle("-fx-font-size: 17px; -fx-font-weight: 800; -fx-text-fill: #047857;");
        Label connectedBadge = new Label("● PAIRED");
        connectedBadge.getStyleClass().addAll("badge", "badge-online");
        connectedHeader.getChildren().addAll(connectedTitle, connectedBadge);

        GridPane connectedGrid = new GridPane();
        connectedGrid.setHgap(16);
        connectedGrid.setVgap(8);

        connectedGrid.add(new Label("Device:"), 0, 0);
        connectedDeviceVal = new Label(AgentRuntime.hostname());
        connectedDeviceVal.setStyle("-fx-font-weight: 700; -fx-text-fill: #0f172a;");
        connectedGrid.add(connectedDeviceVal, 1, 0);

        connectedGrid.add(new Label("Workspace:"), 0, 1);
        String ws = store.allowedWorkspace();
        connectedWorkspaceVal = new Label(ws != null && !ws.isBlank() ? ws : "(Not configured)");
        connectedWorkspaceVal.getStyleClass().add("mono-path");
        HBox wsRow = new HBox(8);
        wsRow.setAlignment(Pos.CENTER_LEFT);
        Button changeWsBtn = new Button("Change");
        changeWsBtn.setOnAction(e -> chooseWorkspace());
        Button openWsBtn = new Button("Open");
        openWsBtn.setOnAction(e -> openWorkspaceFolder());
        wsRow.getChildren().addAll(connectedWorkspaceVal, changeWsBtn, openWsBtn);
        connectedGrid.add(wsRow, 1, 1);

        connectedGrid.add(new Label("Core Connection:"), 0, 2);
        connectedCoreVal = new Label(runtime != null && runtime.isConnected() ? "● Online" : "● Offline");
        connectedCoreVal.setStyle(runtime != null && runtime.isConnected() ? "-fx-font-weight: 700; -fx-text-fill: #047857;" : "-fx-font-weight: 700; -fx-text-fill: #64748b;");
        connectedGrid.add(connectedCoreVal, 1, 2);

        HBox connectedBtnBox = new HBox(10);
        connectedBtnBox.setAlignment(Pos.CENTER_LEFT);

        Button openTronWebBtn = new Button("↗ Open TRON Web");
        openTronWebBtn.getStyleClass().add("btn-primary");
        openTronWebBtn.setOnAction(e -> openConsole());

        Button connectedSettingsBtn = new Button("⚙ Settings");
        connectedSettingsBtn.setOnAction(e -> showConnectionSettingsDialog());

        Region btnSpacer = new Region();
        HBox.setHgrow(btnSpacer, Priority.ALWAYS);

        Button unpairBtn = new Button("↺ Disconnect");
        unpairBtn.getStyleClass().add("btn-danger");
        unpairBtn.setOnAction(e -> {
            Alert confirm = new Alert(Alert.AlertType.CONFIRMATION);
            confirm.setTitle("Disconnect Device");
            confirm.setHeaderText("Disconnect this PC from TRON");
            confirm.setContentText("This will remove local credentials and disconnect from TRON Core. You can reconnect anytime.");
            confirm.showAndWait().ifPresent(res -> {
                if (res == ButtonType.OK && runtime != null) {
                    try {
                        runtime.unpair();
                        applyPairingUiState(AgentRuntime.PairingUiState.UNCONNECTED, null, 0, null);
                    } catch (Exception ignored) {
                    }
                }
            });
        });

        connectedBtnBox.getChildren().addAll(openTronWebBtn, connectedSettingsBtn, btnSpacer, unpairBtn);
        primaryConnectedBox.getChildren().addAll(connectedHeader, connectedGrid, connectedBtnBox);

        // Initial visibility
        primaryUnconnectedBox.setVisible(!initialPaired);
        primaryUnconnectedBox.setManaged(!initialPaired);
        primaryConnectedBox.setVisible(initialPaired);
        primaryConnectedBox.setManaged(initialPaired);

        card.getChildren().addAll(
                primaryUnconnectedBox,
                primaryBrowserWaitingBox,
                primaryBrowserExpiredBox,
                primaryCoreOfflineBox,
                primaryPairingCodeBox,
                primaryConnectedBox
        );
        return card;
    }

    private HBox buildSecondarySections() {
        HBox row = new HBox(14);
        row.setAlignment(Pos.TOP_LEFT);

        // 1. Current Task Card
        VBox taskCard = new VBox(10);
        taskCard.getStyleClass().add("card");
        HBox.setHgrow(taskCard, Priority.ALWAYS);

        HBox taskHead = new HBox(8);
        taskHead.setAlignment(Pos.CENTER_LEFT);
        Label taskTitle = new Label("CURRENT TASK");
        taskTitle.getStyleClass().add("card-section-title");
        Region taskSpacer = new Region();
        HBox.setHgrow(taskSpacer, Priority.ALWAYS);
        taskStatusBadge = new Label("IDLE");
        taskStatusBadge.getStyleClass().addAll("badge", "badge-neutral");
        taskHead.getChildren().addAll(taskTitle, taskSpacer, taskStatusBadge);

        taskSummaryLabel = new Label("No active task");
        taskSummaryLabel.setStyle("-fx-font-size: 13px; -fx-font-weight: 600; -fx-text-fill: #475569;");

        taskDetailLabel = new Label("Tasks initiated in TRON Web will execute locally here.");
        taskDetailLabel.setStyle("-fx-font-size: 11px; -fx-text-fill: #94a3b8;");
        taskDetailLabel.setWrapText(true);

        taskActionBox = new HBox(8);
        taskActionBox.setVisible(false);
        taskActionBox.setManaged(false);

        taskPauseBtn = new Button("Pause");
        taskPauseBtn.setOnAction(e -> {
            if (runtime != null) {
                runtime.pauseActiveTask();
            }
        });

        taskTakeControlBtn = new Button("Take Control");
        taskTakeControlBtn.setOnAction(e -> {
            if (runtime != null) {
                runtime.takeControlActiveTask();
            }
        });

        taskStopBtn = new Button("Stop");
        taskStopBtn.getStyleClass().add("btn-danger");
        taskStopBtn.setOnAction(e -> {
            if (runtime != null) {
                runtime.stopActiveTask();
            }
        });

        taskActionBox.getChildren().addAll(taskPauseBtn, taskTakeControlBtn, taskStopBtn);
        taskCard.getChildren().addAll(taskHead, taskSummaryLabel, taskDetailLabel, taskActionBox);

        // 2. Managed Browser Card
        VBox browserCard = new VBox(10);
        browserCard.getStyleClass().add("card");
        HBox.setHgrow(browserCard, Priority.ALWAYS);

        HBox browserHead = new HBox(8);
        browserHead.setAlignment(Pos.CENTER_LEFT);
        Label browserTitle = new Label("MANAGED BROWSER");
        browserTitle.getStyleClass().add("card-section-title");
        Region browserSpacer = new Region();
        HBox.setHgrow(browserSpacer, Priority.ALWAYS);
        browserStateBadge = new Label("CLOSED");
        browserStateBadge.getStyleClass().addAll("badge", "badge-neutral");
        browserHead.getChildren().addAll(browserTitle, browserSpacer, browserStateBadge);

        browserSummaryLabel = new Label("No browser session");
        browserSummaryLabel.setStyle("-fx-font-size: 13px; -fx-font-weight: 600; -fx-text-fill: #475569;");

        browserDetailLabel = new Label("TRON launches isolated Playwright sessions when web navigation is needed.");
        browserDetailLabel.setStyle("-fx-font-size: 11px; -fx-text-fill: #94a3b8;");
        browserDetailLabel.setWrapText(true);

        browserActionBox = new HBox(8);
        browserActionBox.setVisible(false);
        browserActionBox.setManaged(false);

        openBrowserBtn = new Button("🌐 Focus Browser");
        openBrowserBtn.setOnAction(e -> {
            if (runtime != null) runtime.openBrowser(null);
        });

        resumeAgentBtn = new Button("▶ Resume");
        resumeAgentBtn.setOnAction(e -> {
            if (runtime != null) runtime.resumeTask();
        });

        closeBrowserBtn = new Button("✕ Close");
        closeBrowserBtn.setOnAction(e -> {
            if (runtime != null) runtime.closeBrowser();
        });

        browserActionBox.getChildren().addAll(openBrowserBtn, resumeAgentBtn, closeBrowserBtn);
        browserCard.getChildren().addAll(browserHead, browserSummaryLabel, browserDetailLabel, browserActionBox);

        // 3. Security Summary Card
        VBox secCard = new VBox(10);
        secCard.getStyleClass().add("card");
        HBox.setHgrow(secCard, Priority.ALWAYS);

        HBox secHead = new HBox(8);
        secHead.setAlignment(Pos.CENTER_LEFT);
        Label secTitle = new Label("SECURITY");
        secTitle.getStyleClass().add("card-section-title");
        Region secSpacer = new Region();
        HBox.setHgrow(secSpacer, Priority.ALWAYS);
        Label secBadge = new Label("ENFORCED");
        secBadge.getStyleClass().addAll("badge", "badge-online");
        secHead.getChildren().addAll(secTitle, secSpacer, secBadge);

        GridPane secGrid = new GridPane();
        secGrid.setHgap(8);
        secGrid.setVgap(4);

        secGrid.add(new Label("Workspace:"), 0, 0);
        secGrid.add(makePolicyPill("Allowed", "policy-cell-allowed"), 1, 0);

        secGrid.add(new Label("File Changes:"), 0, 1);
        secGrid.add(makePolicyPill("Allowed", "policy-cell-allowed"), 1, 1);

        secGrid.add(new Label("Delete:"), 0, 2);
        secGrid.add(makePolicyPill("Approval required", "policy-cell-approval"), 1, 2);

        secGrid.add(new Label("Git Push:"), 0, 3);
        secGrid.add(makePolicyPill("Approval required", "policy-cell-approval"), 1, 3);

        Button viewSecPolicyBtn = new Button("View Security Policy");
        viewSecPolicyBtn.getStyleClass().add("btn-link");
        viewSecPolicyBtn.setOnAction(e -> showSecurityPolicyDialog());

        secCard.getChildren().addAll(secHead, secGrid, viewSecPolicyBtn);

        row.getChildren().addAll(taskCard, browserCard, secCard);
        return row;
    }

    private VBox buildAdvancedDetailsSection() {
        VBox section = new VBox(8);

        advancedDetailsToggleBtn = new Button("▶ Advanced Details");
        advancedDetailsToggleBtn.getStyleClass().add("collapsible-header");

        advancedDetailsContent = new VBox(10);
        advancedDetailsContent.getStyleClass().add("card");
        advancedDetailsContent.setVisible(false);
        advancedDetailsContent.setManaged(false);

        GridPane grid = new GridPane();
        grid.setHgap(14);
        grid.setVgap(6);

        grid.add(new Label("Device UUID:"), 0, 0);
        advDeviceUuidVal = new Label(shortUuid(store.deviceUuid()));
        advDeviceUuidVal.getStyleClass().add("mono-path");
        grid.add(advDeviceUuidVal, 1, 0);

        grid.add(new Label("Agent Version:"), 0, 1);
        advAgentVersionVal = new Label("v" + AgentRuntime.AGENT_VERSION);
        grid.add(advAgentVersionVal, 1, 1);

        grid.add(new Label("Core URL:"), 0, 2);
        advCoreUrlVal = new Label(store.coreUrl() != null ? store.coreUrl() : "ws://localhost:8080/api/v1/desktop-agent/ws");
        advCoreUrlVal.getStyleClass().add("mono-path");
        grid.add(advCoreUrlVal, 1, 2);

        grid.add(new Label("Last Heartbeat:"), 0, 3);
        advHeartbeatVal = new Label("Never");
        grid.add(advHeartbeatVal, 1, 3);

        grid.add(new Label("Protocol Status:"), 0, 4);
        advProtocolStatusVal = new Label("Disconnected");
        grid.add(advProtocolStatusVal, 1, 4);

        grid.add(new Label("Browser State:"), 0, 5);
        advBrowserStateVal = new Label("CLOSED");
        grid.add(advBrowserStateVal, 1, 5);

        grid.add(new Label("Workspace Path:"), 0, 6);
        advWorkspaceVal = new Label(store.allowedWorkspace() != null ? store.allowedWorkspace() : "Not configured");
        advWorkspaceVal.getStyleClass().add("mono-path");
        grid.add(advWorkspaceVal, 1, 6);

        Button resetIdBtn = new Button("Reset Local Identity");
        resetIdBtn.getStyleClass().add("btn-danger");
        resetIdBtn.setOnAction(e -> confirmResetLocalIdentity());

        advancedDetailsContent.getChildren().addAll(grid, resetIdBtn);

        advancedDetailsToggleBtn.setOnAction(e -> {
            boolean visible = !advancedDetailsContent.isVisible();
            advancedDetailsContent.setVisible(visible);
            advancedDetailsContent.setManaged(visible);
            advancedDetailsToggleBtn.setText(visible ? "▼ Advanced Details" : "▶ Advanced Details");
        });

        section.getChildren().addAll(advancedDetailsToggleBtn, advancedDetailsContent);
        return section;
    }

    private VBox buildActivityLogSection() {
        VBox section = new VBox(8);

        HBox top = new HBox(8);
        top.setAlignment(Pos.CENTER_LEFT);

        logToggleBtn = new Button("▶ Activity & Security Events");
        logToggleBtn.getStyleClass().add("collapsible-header");

        eventCountBadge = new Label("0 events");
        eventCountBadge.getStyleClass().addAll("badge", "badge-neutral");

        Region spacer = new Region();
        HBox.setHgrow(spacer, Priority.ALWAYS);

        Button copyLog = new Button("📋 Copy Log");
        copyLog.setOnAction(e -> copyActivityLog());

        Button clearLog = new Button("🗑 Clear");
        clearLog.setOnAction(e -> {
            activityListView.getItems().clear();
            eventCountBadge.setText("0 events");
        });

        top.getChildren().addAll(logToggleBtn, eventCountBadge, spacer, copyLog, clearLog);

        logContentBox = new VBox(8);
        logContentBox.setVisible(false);
        logContentBox.setManaged(false);

        activityListView = new ListView<>();
        activityListView.getStyleClass().add("log-view");
        activityListView.setPrefHeight(130);
        logContentBox.getChildren().add(activityListView);

        logToggleBtn.setOnAction(e -> {
            boolean visible = !logContentBox.isVisible();
            logContentBox.setVisible(visible);
            logContentBox.setManaged(visible);
            logToggleBtn.setText(visible ? "▼ Activity & Security Events" : "▶ Activity & Security Events");
        });

        section.getChildren().addAll(top, logContentBox);
        return section;
    }

    private HBox buildFooter() {
        HBox footer = new HBox(12);
        footer.getStyleClass().add("footer-bar");
        footer.setAlignment(Pos.CENTER_LEFT);

        Label f1 = new Label("TRON Desktop Agent v" + AgentRuntime.AGENT_VERSION);
        Region sp = new Region();
        HBox.setHgrow(sp, Priority.ALWAYS);
        Label f2 = new Label("Single instance active • Protected local workspace sandbox");

        footer.getChildren().addAll(f1, sp, f2);
        return footer;
    }

    private Label makePolicyPill(String text, String styleClass) {
        Label l = new Label(text);
        l.getStyleClass().add(styleClass);
        return l;
    }

    private void startRuntime() {
        runtime = new AgentRuntime(store, new AgentRuntime.AgentUi() {
            @Override
            public boolean confirmSignedInAccount() {
                if (!Platform.isFxApplicationThread()) {
                    java.util.concurrent.CompletableFuture<Boolean> answer = new java.util.concurrent.CompletableFuture<>();
                    Platform.runLater(() -> answer.complete(confirmSignedInAccount()));
                    try {
                        return answer.get(2, java.util.concurrent.TimeUnit.MINUTES);
                    } catch (Exception e) {
                        return false;
                    }
                }
                Alert confirm = new Alert(Alert.AlertType.CONFIRMATION);
                confirm.setTitle("Connect this computer");
                confirm.setHeaderText("Connect this computer to the TRON account you just signed in with?");
                ButtonType connect = new ButtonType("Connect", ButtonBar.ButtonData.OK_DONE);
                ButtonType cancel = new ButtonType("Cancel", ButtonBar.ButtonData.CANCEL_CLOSE);
                confirm.getButtonTypes().setAll(cancel, connect);
                return confirm.showAndWait().orElse(cancel) == connect;
            }

            @Override
            public void status(String connectionText, String detail) {
                Platform.runLater(() -> {
                    boolean online = "Connected".equalsIgnoreCase(connectionText);
                    headerConnectionBadge.setText(online ? "● ONLINE" : "● OFFLINE");
                    headerConnectionBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting");
                    headerConnectionBadge.getStyleClass().add(online ? "badge-online" : "badge-offline");

                    if (connectedCoreVal != null) {
                        connectedCoreVal.setText(online ? "● Online" : "● Offline");
                        connectedCoreVal.setStyle(online ? "-fx-font-weight: 700; -fx-text-fill: #047857;" : "-fx-font-weight: 700; -fx-text-fill: #64748b;");
                    }

                    if (advProtocolStatusVal != null) {
                        advProtocolStatusVal.setText(detail != null ? detail : connectionText);
                    }

                    if (trayStatusItem != null) {
                        trayStatusItem.setLabel("Status: " + (online ? "Online" : "Offline"));
                    }
                    if (trayIcon != null) {
                        trayIcon.setToolTip("TRON Desktop Agent - " + (online ? "Online" : "Offline"));
                    }
                });
            }

            @Override
            public void pairingStateChanged(AgentRuntime.PairingUiState state, String code, int expiresInSeconds, String safeDetail) {
                Platform.runLater(() -> applyPairingUiState(state, code, expiresInSeconds, safeDetail));
            }

            @Override
            public void browserLinkWaiting(String linkRequestId, String authorizationUrl, int expiresInSeconds) {
                Platform.runLater(() -> {
                    if (browserWaitingUrlLabel != null) {
                        browserWaitingUrlLabel.setText(authorizationUrl != null ? authorizationUrl : "");
                    }
                    startBrowserCountdown(expiresInSeconds);
                    applyPairingUiState(AgentRuntime.PairingUiState.BROWSER_WAITING, null, expiresInSeconds, authorizationUrl);
                });
            }

            @Override
            public void pairingCode(String code, int expiresInSeconds) {
                Platform.runLater(() -> applyPairingUiState(AgentRuntime.PairingUiState.READY, code, expiresInSeconds, null));
            }

            @Override
            public void pairingWaitingForCore(String reason) {
                Platform.runLater(() -> applyPairingUiState(AgentRuntime.PairingUiState.CORE_OFFLINE, null, 0, reason));
            }

            @Override
            public void paired(String deviceUuid) {
                Platform.runLater(() -> {
                    applyPairingUiState(AgentRuntime.PairingUiState.PAIRED, null, 0, null);
                    if (advDeviceUuidVal != null) {
                        advDeviceUuidVal.setText(shortUuid(deviceUuid));
                    }
                });
            }

            @Override
            public void taskUpdated(String taskId, String status, String goal, String controlMode, String step, boolean waiting) {
                Platform.runLater(() -> {
                    boolean hasTask = taskId != null && !taskId.isBlank() && !"No active task".equalsIgnoreCase(taskId);
                    if (!hasTask) {
                        taskSummaryLabel.setText("No active task");
                        taskDetailLabel.setText("Tasks initiated in TRON Web will execute locally here.");
                        taskStatusBadge.setText("IDLE");
                        taskStatusBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");
                        taskStatusBadge.getStyleClass().add("badge-neutral");
                        taskActionBox.setVisible(false);
                        taskActionBox.setManaged(false);
                        userActionCard.setVisible(false);
                        userActionCard.setManaged(false);

                        // Contradictory state fix: reset header badge to ONLINE (if connected) or OFFLINE
                        boolean online = runtime != null && runtime.isConnected();
                        headerConnectionBadge.setText(online ? "● ONLINE" : "● OFFLINE");
                        headerConnectionBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting");
                        headerConnectionBadge.getStyleClass().add(online ? "badge-online" : "badge-offline");
                        return;
                    }

                    taskSummaryLabel.setText(goal != null && !goal.isBlank() ? goal : "Task: " + shortId(taskId));
                    taskDetailLabel.setText(step != null && !step.isBlank() ? "Step: " + step : "Execution in progress...");

                    taskStatusBadge.setText(status != null ? status : "RUNNING");
                    taskStatusBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");

                    if ("RUNNING".equalsIgnoreCase(status)) {
                        taskStatusBadge.getStyleClass().add("badge-busy");
                        headerConnectionBadge.setText("● BUSY");
                        headerConnectionBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting");
                        headerConnectionBadge.getStyleClass().add("badge-busy");
                        taskActionBox.setVisible(true);
                        taskActionBox.setManaged(true);
                    } else if ("WAITING USER".equalsIgnoreCase(status) || waiting) {
                        taskStatusBadge.getStyleClass().add("badge-waiting");
                        headerConnectionBadge.setText("● WAITING USER");
                        headerConnectionBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting");
                        headerConnectionBadge.getStyleClass().add("badge-waiting");
                        taskActionBox.setVisible(true);
                        taskActionBox.setManaged(true);
                    } else if ("COMPLETED".equalsIgnoreCase(status)) {
                        taskStatusBadge.getStyleClass().add("badge-online");
                        taskActionBox.setVisible(false);
                        taskActionBox.setManaged(false);
                    } else {
                        taskStatusBadge.getStyleClass().add("badge-neutral");
                        taskActionBox.setVisible(false);
                        taskActionBox.setManaged(false);
                    }

                    userActionCard.setVisible(waiting);
                    userActionCard.setManaged(waiting);
                });
            }

            @Override
            public void browserUpdated(String state, String url, String title) {
                Platform.runLater(() -> {
                    String normState = state != null ? state : "CLOSED";
                    boolean hasSession = url != null && !url.isBlank() && !"None".equalsIgnoreCase(url);

                    if (!hasSession || "CLOSED".equalsIgnoreCase(normState)) {
                        browserStateBadge.setText("CLOSED");
                        browserStateBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");
                        browserStateBadge.getStyleClass().add("badge-neutral");
                        browserSummaryLabel.setText("No browser session");
                        browserDetailLabel.setText("TRON launches isolated Playwright sessions when web navigation is needed.");
                        browserActionBox.setVisible(false);
                        browserActionBox.setManaged(false);
                        if (advBrowserStateVal != null) advBrowserStateVal.setText("CLOSED");
                        return;
                    }

                    browserStateBadge.setText(normState);
                    browserStateBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");

                    if ("AGENT_CONTROLLED".equalsIgnoreCase(normState)) {
                        browserStateBadge.getStyleClass().add("badge-busy");
                    } else if ("USER_CONTROLLED".equalsIgnoreCase(normState) || "WAITING_USER".equalsIgnoreCase(normState)) {
                        browserStateBadge.getStyleClass().add("badge-waiting");
                    } else {
                        browserStateBadge.getStyleClass().add("badge-neutral");
                    }

                    browserSummaryLabel.setText(title != null && !title.isBlank() ? title : url);
                    browserDetailLabel.setText(url);
                    browserActionBox.setVisible(true);
                    browserActionBox.setManaged(true);
                    if (advBrowserStateVal != null) advBrowserStateVal.setText(normState);
                });
            }

            @Override
            public void heartbeat(Instant timestamp) {
                Platform.runLater(() -> {
                    lastHeartbeatTime = timestamp;
                    if (advHeartbeatVal != null) advHeartbeatVal.setText("Just now");
                });
            }

            @Override
            public void logEvent(String event) {
                Platform.runLater(() -> appendLog(event));
            }

            @Override
            public void approval(String taskId, String action, String risk, String cmdPreview, String pathPreview, java.util.function.Consumer<Boolean> decision) {
                Platform.runLater(() -> showApprovalDialog(taskId, action, risk, cmdPreview, pathPreview, decision));
            }
        });

        Thread worker = new Thread(() -> {
            try {
                runtime.start();
                Platform.runLater(() -> {
                    if (advDeviceUuidVal != null && store.deviceUuid() != null) {
                        advDeviceUuidVal.setText(shortUuid(store.deviceUuid()));
                    }
                    if (store.isPaired()) {
                        applyPairingUiState(AgentRuntime.PairingUiState.PAIRED, null, 0, null);
                    } else {
                        applyPairingUiState(AgentRuntime.PairingUiState.UNCONNECTED, null, 0, null);
                    }
                });
            } catch (Exception e) {
                Platform.runLater(() -> {
                    if (advProtocolStatusVal != null) {
                        advProtocolStatusVal.setText("Runtime start error: " + e.getMessage());
                    }
                });
            }
        }, "tron-desktop-runtime");
        worker.setDaemon(true);
        worker.start();
    }

    private void hideAllPairingSubBoxes() {
        if (primaryUnconnectedBox != null) {
            primaryUnconnectedBox.setVisible(false);
            primaryUnconnectedBox.setManaged(false);
        }
        if (primaryBrowserWaitingBox != null) {
            primaryBrowserWaitingBox.setVisible(false);
            primaryBrowserWaitingBox.setManaged(false);
        }
        if (primaryBrowserExpiredBox != null) {
            primaryBrowserExpiredBox.setVisible(false);
            primaryBrowserExpiredBox.setManaged(false);
        }
        if (primaryCoreOfflineBox != null) {
            primaryCoreOfflineBox.setVisible(false);
            primaryCoreOfflineBox.setManaged(false);
        }
        if (primaryPairingCodeBox != null) {
            primaryPairingCodeBox.setVisible(false);
            primaryPairingCodeBox.setManaged(false);
        }
        if (primaryConnectedBox != null) {
            primaryConnectedBox.setVisible(false);
            primaryConnectedBox.setManaged(false);
        }
    }

    private void startBrowserCountdown(int expiresInSeconds) {
        if (countdownTimeline != null) {
            countdownTimeline.stop();
        }
        remainingSeconds.set(expiresInSeconds > 0 ? expiresInSeconds : 600);
        int initialM = remainingSeconds.get() / 60;
        int initialS = remainingSeconds.get() % 60;
        if (browserWaitingCountdownLabel != null) {
            browserWaitingCountdownLabel.setText(String.format("Expires in %02d:%02d", initialM, initialS));
        }
        countdownTimeline = new Timeline(new KeyFrame(Duration.seconds(1), e -> {
            int sec = remainingSeconds.decrementAndGet();
            if (sec <= 0) {
                if (browserWaitingCountdownLabel != null) {
                    browserWaitingCountdownLabel.setText("Authorization expired.");
                }
                countdownTimeline.stop();
                applyPairingUiState(AgentRuntime.PairingUiState.BROWSER_EXPIRED, null, 0, "Authorization expired.");
            } else {
                int m = sec / 60;
                int s = sec % 60;
                if (browserWaitingCountdownLabel != null) {
                    browserWaitingCountdownLabel.setText(String.format("Expires in %02d:%02d", m, s));
                }
            }
        }));
        countdownTimeline.setCycleCount(Timeline.INDEFINITE);
        countdownTimeline.play();
    }

    private void applyPairingUiState(AgentRuntime.PairingUiState state, String code, int expiresInSeconds, String safeDetail) {
        if (state == null) return;

        // Contradictory state guard: If already paired, do not regress to READY/REQUESTING
        if (store != null && store.isPaired() && (state == AgentRuntime.PairingUiState.READY || state == AgentRuntime.PairingUiState.REQUESTING)) {
            state = AgentRuntime.PairingUiState.PAIRED;
        }

        switch (state) {
            case UNCONNECTED -> {
                if (countdownTimeline != null) countdownTimeline.stop();
                hideAllPairingSubBoxes();
                if (primaryUnconnectedBox != null) {
                    primaryUnconnectedBox.setVisible(true);
                    primaryUnconnectedBox.setManaged(true);
                }
                showRepairActions(false);
            }
            case BROWSER_WAITING -> {
                hideAllPairingSubBoxes();
                if (primaryBrowserWaitingBox != null) {
                    primaryBrowserWaitingBox.setVisible(true);
                    primaryBrowserWaitingBox.setManaged(true);
                }
                if (safeDetail != null && !safeDetail.isBlank() && browserWaitingUrlLabel != null) {
                    browserWaitingUrlLabel.setText(safeDetail);
                }
                showRepairActions(false);
            }
            case BROWSER_EXPIRED -> {
                if (countdownTimeline != null) countdownTimeline.stop();
                hideAllPairingSubBoxes();
                if (primaryBrowserExpiredBox != null) {
                    primaryBrowserExpiredBox.setVisible(true);
                    primaryBrowserExpiredBox.setManaged(true);
                }
                showRepairActions(false);
            }
            case CORE_OFFLINE -> {
                if (countdownTimeline != null) countdownTimeline.stop();
                hideAllPairingSubBoxes();
                if (primaryCoreOfflineBox != null) {
                    primaryCoreOfflineBox.setVisible(true);
                    primaryCoreOfflineBox.setManaged(true);
                }
                if (safeDetail != null && coreOfflineDetailLabel != null) {
                    coreOfflineDetailLabel.setText(safeDetail);
                }
                showRepairActions(false);
            }
            case REQUESTING -> {
                if (countdownTimeline != null) countdownTimeline.stop();
                hideAllPairingSubBoxes();
                if (primaryPairingCodeBox != null) {
                    primaryPairingCodeBox.setVisible(true);
                    primaryPairingCodeBox.setManaged(true);
                }
                if (pairingCodeDisplay != null) pairingCodeDisplay.setText("···-···");
                if (pairingCountdownLabel != null) {
                    pairingCountdownLabel.setText(safeDetail != null ? safeDetail : "Requesting pairing code from Core...");
                }
                if (pairingWaitingLabel != null) {
                    pairingWaitingLabel.setVisible(false);
                    pairingWaitingLabel.setManaged(false);
                }
                if (copyCodeBtn != null) copyCodeBtn.setDisable(true);
                showRepairActions(false);
            }
            case READY -> {
                hideAllPairingSubBoxes();
                if (primaryPairingCodeBox != null) {
                    primaryPairingCodeBox.setVisible(true);
                    primaryPairingCodeBox.setManaged(true);
                }
                if (pairingCodeDisplay != null) pairingCodeDisplay.setText(code != null ? code : "···-···");
                remainingSeconds.set(expiresInSeconds > 0 ? expiresInSeconds : 600);
                startPairingCountdown();
                if (pairingWaitingLabel != null) {
                    pairingWaitingLabel.setVisible(false);
                    pairingWaitingLabel.setManaged(false);
                }
                if (copyCodeBtn != null) copyCodeBtn.setDisable(false);
                showRepairActions(false);
            }
            case REPAIR_REQUIRED -> {
                hideAllPairingSubBoxes();
                if (primaryPairingCodeBox != null) {
                    primaryPairingCodeBox.setVisible(true);
                    primaryPairingCodeBox.setManaged(true);
                }
                if (pairingCodeDisplay != null) pairingCodeDisplay.setText(code != null ? code : "···-···");
                remainingSeconds.set(expiresInSeconds > 0 ? expiresInSeconds : 600);
                startPairingCountdown();
                if (pairingWaitingLabel != null) {
                    pairingWaitingLabel.setText(safeDetail != null ? safeDetail
                            : "TRON Core already knows this device, but this installation no longer has a valid device credential.");
                    pairingWaitingLabel.setVisible(true);
                    pairingWaitingLabel.setManaged(true);
                }
                if (copyCodeBtn != null) copyCodeBtn.setDisable(code == null || code.contains("·"));
                showRepairActions(true);
            }
            case FAILED -> {
                if (countdownTimeline != null) countdownTimeline.stop();
                hideAllPairingSubBoxes();
                if (primaryPairingCodeBox != null) {
                    primaryPairingCodeBox.setVisible(true);
                    primaryPairingCodeBox.setManaged(true);
                }
                if (pairingCodeDisplay != null) pairingCodeDisplay.setText("···-···");
                if (pairingCountdownLabel != null) pairingCountdownLabel.setText("Could not request pairing code.");
                if (pairingWaitingLabel != null) {
                    pairingWaitingLabel.setText(safeDetail != null ? safeDetail : "Could not request pairing code.");
                    pairingWaitingLabel.setVisible(true);
                    pairingWaitingLabel.setManaged(true);
                }
                if (copyCodeBtn != null) copyCodeBtn.setDisable(true);
                showRepairActions(false);
            }
            case EXPIRED -> {
                if (countdownTimeline != null) countdownTimeline.stop();
                hideAllPairingSubBoxes();
                if (primaryPairingCodeBox != null) {
                    primaryPairingCodeBox.setVisible(true);
                    primaryPairingCodeBox.setManaged(true);
                }
                if (pairingCodeDisplay != null) pairingCodeDisplay.setText("···-···");
                if (pairingCountdownLabel != null) pairingCountdownLabel.setText("Pairing code expired.");
                if (pairingWaitingLabel != null) {
                    pairingWaitingLabel.setText("Click Refresh to generate a new code.");
                    pairingWaitingLabel.setVisible(true);
                    pairingWaitingLabel.setManaged(true);
                }
                if (copyCodeBtn != null) copyCodeBtn.setDisable(true);
                showRepairActions(false);
            }
            case PAIRED -> {
                if (countdownTimeline != null) countdownTimeline.stop();
                hideAllPairingSubBoxes();
                if (primaryConnectedBox != null) {
                    primaryConnectedBox.setVisible(true);
                    primaryConnectedBox.setManaged(true);
                }
                if (connectedDeviceVal != null) {
                    connectedDeviceVal.setText(AgentRuntime.hostname());
                }
                if (connectedWorkspaceVal != null) {
                    String ws = store.allowedWorkspace();
                    connectedWorkspaceVal.setText(ws != null && !ws.isBlank() ? ws : "(Not configured)");
                }
                if (connectedCoreVal != null) {
                    boolean online = runtime != null && runtime.isConnected();
                    connectedCoreVal.setText(online ? "● Online" : "● Offline");
                    connectedCoreVal.setStyle(online ? "-fx-font-weight: 700; -fx-text-fill: #047857;" : "-fx-font-weight: 700; -fx-text-fill: #64748b;");
                }
                showRepairActions(false);
            }
        }
    }

    private void showApprovalDialog(String taskId, String action, String risk, String cmdPreview, String pathPreview, java.util.function.Consumer<Boolean> decision) {
        Alert alert = new Alert(Alert.AlertType.NONE);
        alert.initOwner(stage);
        alert.initModality(Modality.APPLICATION_MODAL);
        alert.setTitle("Dangerous Action Requires Approval");
        alert.setHeaderText("TRON Security Policy Gate");

        VBox content = new VBox(12);
        content.setPadding(new Insets(10));
        content.setMinWidth(480);

        Label summaryLabel = new Label("Action: " + (action != null ? action : "Dangerous operation"));
        summaryLabel.setStyle("-fx-font-weight: bold; -fx-font-size: 13px; -fx-text-fill: #0f172a;");
        summaryLabel.setWrapText(true);

        Label riskBadge = new Label("Risk: " + (risk != null ? risk : "REQUIRES_APPROVAL"));
        riskBadge.getStyleClass().addAll("badge", "policy-cell-approval");

        content.getChildren().addAll(summaryLabel, riskBadge);

        if (cmdPreview != null && !cmdPreview.isBlank()) {
            Label cmdTitle = new Label("Command Preview:");
            cmdTitle.setStyle("-fx-font-size: 11px; -fx-font-weight: 600; -fx-text-fill: #64748b;");
            Label cmdBox = new Label(cmdPreview);
            cmdBox.getStyleClass().add("mono-path");
            cmdBox.setWrapText(true);
            content.getChildren().addAll(cmdTitle, cmdBox);
        }

        if (pathPreview != null && !pathPreview.isBlank()) {
            Label pathTitle = new Label("Path Preview:");
            pathTitle.setStyle("-fx-font-size: 11px; -fx-font-weight: 600; -fx-text-fill: #64748b;");
            Label pathBox = new Label(pathPreview);
            pathBox.getStyleClass().add("mono-path");
            pathBox.setWrapText(true);
            content.getChildren().addAll(pathTitle, pathBox);
        }

        Label prompt = new Label("Do you want to authorize TRON to execute this action once?");
        prompt.setStyle("-fx-font-size: 12px; -fx-text-fill: #334155;");
        content.getChildren().add(prompt);

        alert.getDialogPane().setContent(content);

        ButtonType denyBtn = new ButtonType("Deny", ButtonBar.ButtonData.CANCEL_CLOSE);
        ButtonType approveBtn = new ButtonType("Approve Once", ButtonBar.ButtonData.OK_DONE);
        alert.getDialogPane().getButtonTypes().setAll(denyBtn, approveBtn);

        alert.showAndWait().ifPresentOrElse(res -> {
            decision.accept(res == approveBtn);
        }, () -> decision.accept(false));
    }

    private void showConnectionSettingsDialog() {
        Dialog<String> dialog = new Dialog<>();
        dialog.initOwner(stage);
        dialog.setTitle("TRON Core Connection Settings");
        dialog.setHeaderText("Configure TRON Core WebSocket URL");

        VBox box = new VBox(12);
        box.setPadding(new Insets(14));
        box.setMinWidth(460);

        Label urlLabel = new Label("TRON Core WebSocket URL:");
        TextField urlField = new TextField(store.coreUrl());
        urlField.getStyleClass().add("mono-path");

        String envCore = System.getenv("TRON_CORE_URL");
        if (envCore != null && !envCore.isBlank()) {
            Label envNote = new Label("ℹ Note: TRON_CORE_URL environment variable is currently active:\n" + envCore);
            envNote.setStyle("-fx-text-fill: #0284c7; -fx-font-size: 11px;");
            box.getChildren().add(envNote);
        }

        HBox presets = new HBox(8);
        Button localBtn = new Button("Local Dev (8080)");
        localBtn.setOnAction(e -> urlField.setText("ws://localhost:8080/api/v1/desktop-agent/ws"));
        Button ipBtn = new Button("IP Dev (127.0.0.1)");
        ipBtn.setOnAction(e -> urlField.setText("ws://127.0.0.1:8080/api/v1/desktop-agent/ws"));
        presets.getChildren().addAll(new Label("Presets:"), localBtn, ipBtn);

        box.getChildren().addAll(urlLabel, urlField, presets);
        dialog.getDialogPane().setContent(box);

        ButtonType saveBtn = new ButtonType("Save & Connect", ButtonBar.ButtonData.OK_DONE);
        dialog.getDialogPane().getButtonTypes().setAll(saveBtn, ButtonType.CANCEL);

        dialog.setResultConverter(button -> {
            if (button == saveBtn) {
                return urlField.getText().trim();
            }
            return null;
        });

        dialog.showAndWait().ifPresent(newUrl -> {
            if (!newUrl.isBlank()) {
                if (advCoreUrlVal != null) advCoreUrlVal.setText(newUrl);
                try {
                    runtime.reconnectWithUrl(newUrl);
                } catch (Exception e) {
                    if (advProtocolStatusVal != null) {
                        advProtocolStatusVal.setText("Failed to save URL: " + e.getMessage());
                    }
                }
            }
        });
    }

    private void showSecurityPolicyDialog() {
        Dialog<Void> dialog = new Dialog<>();
        dialog.initOwner(stage);
        dialog.setTitle("TRON Security Policy");
        dialog.setHeaderText("Desktop Agent Security & Execution Boundaries");

        VBox box = new VBox(12);
        box.setPadding(new Insets(16));
        box.setMinWidth(500);

        Label note = new Label("TRON Desktop Agent strictly executes actions inside your authorized workspace directory.\nActions modifying code or system state follow predefined policies:");
        note.setStyle("-fx-line-spacing: 2px; -fx-text-fill: #334155; -fx-font-size: 12px;");

        GridPane matrix = new GridPane();
        matrix.setHgap(14);
        matrix.setVgap(8);

        matrix.add(new Label("Workspace Files:"), 0, 0);
        matrix.add(makePolicyPill("Allowed", "policy-cell-allowed"), 1, 0);

        matrix.add(new Label("Terminal / Commands:"), 0, 1);
        matrix.add(makePolicyPill("Allowed", "policy-cell-allowed"), 1, 1);

        matrix.add(new Label("Git Read / Diff:"), 0, 2);
        matrix.add(makePolicyPill("Allowed", "policy-cell-allowed"), 1, 2);

        matrix.add(new Label("Managed Browser:"), 0, 3);
        matrix.add(makePolicyPill("Allowed", "policy-cell-allowed"), 1, 3);

        matrix.add(new Label("File Deletion:"), 2, 0);
        matrix.add(makePolicyPill("Approval Required", "policy-cell-approval"), 3, 0);

        matrix.add(new Label("Git Commit:"), 2, 1);
        matrix.add(makePolicyPill("Approval Required", "policy-cell-approval"), 3, 1);

        matrix.add(new Label("Git Push:"), 2, 2);
        matrix.add(makePolicyPill("Approval Required", "policy-cell-approval"), 3, 2);

        matrix.add(new Label("System / OS:"), 2, 3);
        matrix.add(makePolicyPill("Restricted / Blocked", "policy-cell-blocked"), 3, 3);

        box.getChildren().addAll(note, matrix);
        dialog.getDialogPane().setContent(box);
        dialog.getDialogPane().getButtonTypes().add(ButtonType.CLOSE);
        dialog.showAndWait();
    }

    private void handleCloseRequest() {
        if (!SystemTray.isSupported()) {
            shutdownAndExit();
            return;
        }

        if (store.isHideToTrayWithoutPrompt()) {
            stage.hide();
            return;
        }

        Alert alert = new Alert(Alert.AlertType.CONFIRMATION);
        alert.initOwner(stage);
        alert.setTitle("TRON Desktop Agent");
        alert.setHeaderText("Close Window Behavior");

        VBox box = new VBox(10);
        Label msg = new Label("TRON Desktop Agent will continue running in the system tray.\n" +
                "You can reopen it anytime by double-clicking the tray icon in your Windows taskbar.");
        msg.setStyle("-fx-line-spacing: 2px; -fx-text-fill: #1e293b;");

        CheckBox dontShow = new CheckBox("Don't show this message again");
        dontShow.setStyle("-fx-font-size: 12px; -fx-text-fill: #475569;");

        box.getChildren().addAll(msg, dontShow);
        alert.getDialogPane().setContent(box);

        ButtonType hideBtn = new ButtonType("Hide to Tray", ButtonBar.ButtonData.OK_DONE);
        ButtonType exitBtn = new ButtonType("Exit", ButtonBar.ButtonData.CANCEL_CLOSE);
        alert.getDialogPane().getButtonTypes().setAll(hideBtn, exitBtn);

        alert.showAndWait().ifPresent(btn -> {
            if (btn == hideBtn) {
                if (dontShow.isSelected()) {
                    try {
                        store.setHideToTrayWithoutPrompt(true);
                    } catch (Exception ignored) {
                    }
                }
                stage.hide();
            } else if (btn == exitBtn) {
                shutdownAndExit();
            }
        });
    }

    private void chooseWorkspace() {
        DirectoryChooser chooser = new DirectoryChooser();
        chooser.setTitle("Select Allowed Workspace Sandbox");
        java.io.File selected = chooser.showDialog(stage);
        if (selected != null) {
            String path = selected.getAbsolutePath();
            if (connectedWorkspaceVal != null) connectedWorkspaceVal.setText(path);
            if (advWorkspaceVal != null) advWorkspaceVal.setText(path);
            try {
                runtime.updateWorkspace(path);
            } catch (Exception e) {
                if (advProtocolStatusVal != null) advProtocolStatusVal.setText("Workspace could not be saved");
            }
        }
    }

    private void openWorkspaceFolder() {
        String path = store.allowedWorkspace();
        if (path == null || path.isBlank()) {
            chooseWorkspace();
            return;
        }
        try {
            java.awt.Desktop.getDesktop().open(new java.io.File(path));
        } catch (Exception e) {
            Platform.runLater(() -> appendLog("Could not open folder: " + e.getMessage()));
        }
    }

    private void appendLog(String event) {
        String time = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm:ss"));
        String entry = "[" + time + "] " + event;
        activityListView.getItems().add(entry);
        if (activityListView.getItems().size() > 200) {
            activityListView.getItems().remove(0);
        }
        activityListView.scrollTo(activityListView.getItems().size() - 1);
        eventCountBadge.setText(activityListView.getItems().size() + " events");
    }

    private void showRepairActions(boolean show) {
        if (repairPairingBtn != null) {
            repairPairingBtn.setVisible(show);
            repairPairingBtn.setManaged(show);
        }
        if (resetIdentityBtn != null) {
            resetIdentityBtn.setVisible(show);
            resetIdentityBtn.setManaged(show);
        }
    }

    private void confirmResetLocalIdentity() {
        Alert confirm = new Alert(Alert.AlertType.CONFIRMATION);
        confirm.initOwner(stage);
        confirm.setTitle("Reset Local Identity");
        confirm.setHeaderText("This creates a new device identity");
        confirm.setContentText("This creates a new device identity. Use only if you cannot recover the existing pairing.");
        confirm.showAndWait().ifPresent(res -> {
            if (res == ButtonType.OK && runtime != null) {
                try {
                    runtime.resetLocalIdentity();
                    if (advDeviceUuidVal != null && store != null && store.deviceUuid() != null) {
                        advDeviceUuidVal.setText(shortUuid(store.deviceUuid()));
                    }
                } catch (Exception ex) {
                    if (advProtocolStatusVal != null) advProtocolStatusVal.setText("Local identity could not be reset");
                }
            }
        });
    }

    private void openConsole() {
        String base = System.getenv().getOrDefault("TRON_WEB_URL", "http://localhost:5174");
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        String web = base.contains("/workspace") ? base : base + "/workspace/agent/devices";
        try {
            java.awt.Desktop.getDesktop().browse(URI.create(web));
        } catch (Exception e) {
            if (advProtocolStatusVal != null) advProtocolStatusVal.setText("Web console could not be opened");
        }
    }

    private void copyPairingCode() {
        String code = pairingCodeDisplay.getText();
        if (code != null && !code.contains("·")) {
            Clipboard clipboard = Clipboard.getSystemClipboard();
            ClipboardContent content = new ClipboardContent();
            content.putString(code);
            clipboard.setContent(content);

            copyCodeBtn.setText("✓ Copied!");
            PauseTransition pause = new PauseTransition(Duration.seconds(2));
            pause.setOnFinished(e -> copyCodeBtn.setText("📋 Copy Code"));
            pause.play();
        }
    }

    private void copyActivityLog() {
        StringBuilder sb = new StringBuilder();
        for (String item : activityListView.getItems()) {
            sb.append(item).append("\n");
        }
        Clipboard clipboard = Clipboard.getSystemClipboard();
        ClipboardContent content = new ClipboardContent();
        content.putString(sb.toString());
        clipboard.setContent(content);
    }

    private void startPairingCountdown() {
        if (countdownTimeline != null) {
            countdownTimeline.stop();
        }
        countdownTimeline = new Timeline(new KeyFrame(Duration.seconds(1), e -> {
            int sec = remainingSeconds.decrementAndGet();
            if (sec <= 0) {
                pairingCountdownLabel.setText("Code expired. Refreshing...");
                countdownTimeline.stop();
                if (runtime != null) runtime.refreshPairingCode();
            } else {
                int m = sec / 60;
                int s = sec % 60;
                pairingCountdownLabel.setText(String.format("Code expires in %02d:%02d", m, s));
            }
        }));
        countdownTimeline.setCycleCount(Timeline.INDEFINITE);
        countdownTimeline.play();
    }

    private void startHeartbeatTicker() {
        Timeline ticker = new Timeline(new KeyFrame(Duration.seconds(1), e -> {
            if (lastHeartbeatTime != null) {
                long elapsed = java.time.Duration.between(lastHeartbeatTime, Instant.now()).getSeconds();
                if (advHeartbeatVal != null) {
                    if (elapsed < 2) {
                        advHeartbeatVal.setText("Just now");
                    } else {
                        advHeartbeatVal.setText(elapsed + "s ago");
                    }
                }
            }
        }));
        ticker.setCycleCount(Timeline.INDEFINITE);
        ticker.play();
    }

    private void installTray(Stage primaryStage) {
        if (!SystemTray.isSupported()) {
            return;
        }
        try {
            Image image = createTrayIconImage();
            trayIcon = new TrayIcon(image, "TRON Desktop Agent - Offline");
            trayIcon.setImageAutoSize(true);

            PopupMenu menu = new PopupMenu();
            MenuItem openItem = new MenuItem("Open TRON Desktop Agent");
            openItem.addActionListener(e -> Platform.runLater(() -> restoreWindow(primaryStage)));

            MenuItem webItem = new MenuItem("Open Web Console");
            webItem.addActionListener(e -> openConsole());

            trayStatusItem = new MenuItem("Status: Offline");
            trayStatusItem.setEnabled(false);

            MenuItem exitItem = new MenuItem("Exit");
            exitItem.addActionListener(e -> Platform.runLater(this::shutdownAndExit));

            menu.add(openItem);
            menu.add(webItem);
            menu.add(trayStatusItem);
            menu.addSeparator();
            menu.add(exitItem);

            trayIcon.setPopupMenu(menu);
            trayIcon.addActionListener(e -> Platform.runLater(() -> restoreWindow(primaryStage)));
            SystemTray.getSystemTray().add(trayIcon);
        } catch (AWTException ignored) {
        }
    }

    private Image createTrayIconImage() {
        BufferedImage img = new BufferedImage(32, 32, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new java.awt.Color(2, 132, 199));
        g.fillRoundRect(2, 2, 28, 28, 8, 8);
        g.setColor(java.awt.Color.WHITE);
        g.setFont(new java.awt.Font("SansSerif", java.awt.Font.BOLD, 20));
        g.drawString("T", 9, 23);
        g.dispose();
        return img;
    }

    public static void restoreWindow(Stage stage) {
        if (!stage.isShowing()) {
            stage.show();
        }
        stage.setIconified(false);
        stage.toFront();
        stage.requestFocus();
        stage.setAlwaysOnTop(true);
        PauseTransition release = new PauseTransition(Duration.millis(800));
        release.setOnFinished(e -> stage.setAlwaysOnTop(false));
        release.play();
    }

    private static void watchShowRequest(Stage primaryStage) {
        Path request = showRequestFile();
        Timeline timeline = new Timeline(new KeyFrame(Duration.seconds(1), event -> {
            if (!Files.exists(request)) {
                return;
            }
            try {
                Files.deleteIfExists(request);
            } catch (Exception ignored) {
            }
            restoreWindow(primaryStage);
        }));
        timeline.setCycleCount(Timeline.INDEFINITE);
        timeline.play();
    }

    private static Path showRequestFile() {
        Path identity = CredentialStore.defaultFile();
        Path folder = identity.getParent() == null ? Path.of(".") : identity.getParent();
        return folder.resolve("show.request");
    }

    private void shutdownAndExit() {
        if (countdownTimeline != null) {
            countdownTimeline.stop();
        }
        if (runtime != null) {
            runtime.shutdown();
        }
        if (trayIcon != null && SystemTray.isSupported()) {
            try {
                SystemTray.getSystemTray().remove(trayIcon);
            } catch (Exception ignored) {
            }
        }
        if (singleInstanceManager != null) {
            singleInstanceManager.close();
        }
        Platform.exit();
        System.exit(0);
    }

    public void captureSnapshot(Path outputPath) throws Exception {
        javafx.scene.image.WritableImage image = stage.getScene().snapshot(null);
        int width = (int) image.getWidth();
        int height = (int) image.getHeight();
        BufferedImage bImage = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        javafx.scene.image.PixelReader pr = image.getPixelReader();
        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                bImage.setRGB(x, y, pr.getArgb(x, y));
            }
        }
        javax.imageio.ImageIO.write(bImage, "png", outputPath.toFile());
    }

    public void testSetState(
            AgentRuntime.PairingUiState pairingState,
            String connectionText,
            String taskId,
            String status,
            String goal,
            String step,
            boolean waitingUser,
            String browserState,
            String browserUrl,
            String browserTitle) {
        if (pairingState != null) {
            applyPairingUiState(pairingState, "378-545", 582, "http://localhost:5174/connect-device?request=req-demo");
        }
        if (connectionText != null) {
            boolean online = "Connected".equalsIgnoreCase(connectionText) || "Online".equalsIgnoreCase(connectionText);
            headerConnectionBadge.setText(online ? "● ONLINE" : "● " + connectionText.toUpperCase());
            headerConnectionBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting");
            headerConnectionBadge.getStyleClass().add(online ? "badge-online" : "badge-offline");
            if (connectedCoreVal != null) {
                connectedCoreVal.setText(online ? "● Online" : "● Offline");
                connectedCoreVal.setStyle(online ? "-fx-font-weight: 700; -fx-text-fill: #047857;" : "-fx-font-weight: 700; -fx-text-fill: #64748b;");
            }
        }
        if (taskId != null) {
            boolean hasTask = !taskId.isBlank() && !"No active task".equalsIgnoreCase(taskId);
            if (hasTask) {
                taskSummaryLabel.setText(goal != null ? goal : "Task: " + shortId(taskId));
                taskDetailLabel.setText(step != null ? "Step: " + step : "Execution in progress...");
                taskStatusBadge.setText(status != null ? status : "RUNNING");
                taskStatusBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");
                taskStatusBadge.getStyleClass().add("badge-busy");
                taskActionBox.setVisible(true);
                taskActionBox.setManaged(true);
                headerConnectionBadge.setText("● BUSY");
                headerConnectionBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting");
                headerConnectionBadge.getStyleClass().add("badge-busy");
            } else {
                taskSummaryLabel.setText("No active task");
                taskDetailLabel.setText("Tasks initiated in TRON Web will execute locally here.");
                taskStatusBadge.setText("IDLE");
                taskStatusBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");
                taskStatusBadge.getStyleClass().add("badge-neutral");
                taskActionBox.setVisible(false);
                taskActionBox.setManaged(false);
            }
        }
        if (browserState != null) {
            boolean hasSession = browserUrl != null && !browserUrl.isBlank() && !"None".equalsIgnoreCase(browserUrl);
            if (!hasSession || "CLOSED".equalsIgnoreCase(browserState)) {
                browserStateBadge.setText("CLOSED");
                browserStateBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");
                browserStateBadge.getStyleClass().add("badge-neutral");
                browserSummaryLabel.setText("No browser session");
                browserDetailLabel.setText("TRON launches isolated Playwright sessions when web navigation is needed.");
                browserActionBox.setVisible(false);
                browserActionBox.setManaged(false);
            } else {
                browserStateBadge.setText(browserState);
                browserStateBadge.getStyleClass().removeAll("badge-online", "badge-offline", "badge-busy", "badge-waiting", "badge-neutral");
                browserStateBadge.getStyleClass().add("badge-busy");
                browserSummaryLabel.setText(browserTitle != null ? browserTitle : browserUrl);
                browserDetailLabel.setText(browserUrl);
                browserActionBox.setVisible(true);
                browserActionBox.setManaged(true);
            }
        }
    }

    private static String shortUuid(String uuid) {
        if (uuid == null) return "Unknown";
        if (uuid.length() <= 12) return uuid;
        return uuid.substring(0, 8) + "..." + uuid.substring(uuid.length() - 4);
    }

    private static String shortId(String id) {
        if (id == null) return "—";
        return id.length() <= 12 ? id : id.substring(0, 10) + "...";
    }

    public static void main(String[] args) {
        singleInstanceManager = new SingleInstanceManager();
        if (!singleInstanceManager.acquireOrSignal()) {
            System.out.println("[TRON Desktop Agent] Existing instance detected. Requested window restore.");
            System.exit(0);
            return;
        }
        launch(args);
    }
}
