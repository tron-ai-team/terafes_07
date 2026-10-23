package com.tronai.desktop.filesystem;

import com.tronai.desktop.policy.Fingerprints;
import com.tronai.desktop.policy.WorkspaceGuard;
import com.tronai.desktop.protocol.ProtocolMessage;

import java.io.IOException;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Stream;

/**
 * Real filesystem operations confined to the allowed workspace.
 */
public final class FileTools {

    private static final Set<String> SKIP = Set.of(".git", "node_modules", "target", "dist", "build");
    private final int maxBytes;

    public FileTools(int maxBytes) {
        this.maxBytes = maxBytes;
    }

    public ProtocolMessage.Result execute(String operation, String workspace, ProtocolMessage.Arguments args) throws IOException {
        return switch (operation) {
            case "LIST_FILES" -> list(workspace, args);
            case "READ_FILE" -> read(workspace, args);
            case "SEARCH_TEXT" -> search(workspace, args);
            case "CREATE_FILE" -> write(workspace, args, false);
            case "WRITE_FILE" -> write(workspace, args, true);
            case "PATCH_FILE" -> patch(workspace, args);
            case "MOVE_FILE" -> move(workspace, args);
            case "DELETE_FILE" -> delete(workspace, args);
            default -> failure("Unknown file operation");
        };
    }

    private ProtocolMessage.Result list(String workspace, ProtocolMessage.Arguments args) throws IOException {
        Path dir = WorkspaceGuard.requireInside(workspace, args.getPath() == null ? workspace : args.getPath(), "Path");
        if (!Files.isDirectory(dir, LinkOption.NOFOLLOW_LINKS)) {
            return failure("Path is not a directory");
        }
        int depth = args.getMaxDepth() == null ? 1 : Math.min(args.getMaxDepth(), 6);
        List<ProtocolMessage.FileEntry> entries = new ArrayList<>();
        try (Stream<Path> walk = Files.walk(dir, depth)) {
            walk.filter(path -> !path.equals(dir)).limit(500).forEach(path -> {
                if (!path.normalize().startsWith(Path.of(workspace).toAbsolutePath().normalize())) {
                    return;
                }
                ProtocolMessage.FileEntry entry = new ProtocolMessage.FileEntry();
                entry.setName(dir.relativize(path).toString());
                entry.setPath(path.toString());
                entry.setDirectory(Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS));
                entry.setSymlink(Files.isSymbolicLink(path));
                try {
                    entry.setSizeBytes(Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS) ? 0 : Files.size(path));
                } catch (IOException e) {
                    entry.setSizeBytes(0);
                }
                entries.add(entry);
            });
        }
        ProtocolMessage.Result result = ok("Listed " + entries.size() + " entries");
        result.setEntries(entries);
        result.setPath(dir.toString());
        return result;
    }

    private ProtocolMessage.Result read(String workspace, ProtocolMessage.Arguments args) throws IOException {
        Path path = WorkspaceGuard.requireInside(workspace, args.getPath(), "Path");
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS)) {
            return failure("Path is not a file");
        }
        long size = Files.size(path);
        if (size > maxBytes) {
            return failure("File exceeds the size limit");
        }
        byte[] bytes = Files.readAllBytes(path);
        if (isBinary(bytes)) {
            return failure("Binary files are not returned as text");
        }
        String text;
        try {
            CharsetDecoder decoder = StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT);
            text = decoder.decode(java.nio.ByteBuffer.wrap(bytes)).toString();
        } catch (CharacterCodingException e) {
            return failure("File is not valid UTF-8");
        }
        ProtocolMessage.Result result = ok("Read " + path.getFileName());
        result.setPath(path.toString());
        result.setStdout(text);
        result.setSizeBytes(size);
        result.setSha256(Fingerprints.sha256(bytes));
        return result;
    }

    private ProtocolMessage.Result search(String workspace, ProtocolMessage.Arguments args) throws IOException {
        if (args.getQuery() == null || args.getQuery().isBlank()) {
            return failure("Search query is required");
        }
        Path root = WorkspaceGuard.requireInside(workspace, args.getPath() == null ? workspace : args.getPath(), "Path");
        String query = args.getQuery().toLowerCase(Locale.ROOT);
        List<ProtocolMessage.SearchHit> hits = new ArrayList<>();
        Files.walkFileTree(root, new java.nio.file.SimpleFileVisitor<>() {
            @Override
            public java.nio.file.FileVisitResult preVisitDirectory(Path dir, java.nio.file.attribute.BasicFileAttributes attrs) {
                if (SKIP.contains(dir.getFileName() == null ? "" : dir.getFileName().toString()) || hits.size() >= 100) {
                    return java.nio.file.FileVisitResult.SKIP_SUBTREE;
                }
                return java.nio.file.FileVisitResult.CONTINUE;
            }

            @Override
            public java.nio.file.FileVisitResult visitFile(Path file, java.nio.file.attribute.BasicFileAttributes attrs) throws IOException {
                if (hits.size() >= 100 || attrs.size() > maxBytes || !attrs.isRegularFile()) {
                    return java.nio.file.FileVisitResult.CONTINUE;
                }
                byte[] bytes = Files.readAllBytes(file);
                if (isBinary(bytes)) {
                    return java.nio.file.FileVisitResult.CONTINUE;
                }
                String text = new String(bytes, StandardCharsets.UTF_8);
                String[] lines = text.split("\n", -1);
                for (int i = 0; i < lines.length && hits.size() < 100; i++) {
                    if (lines[i].toLowerCase(Locale.ROOT).contains(query)) {
                        ProtocolMessage.SearchHit hit = new ProtocolMessage.SearchHit();
                        hit.setPath(file.toString());
                        hit.setLine(i + 1);
                        hit.setText(lines[i].length() > 240 ? lines[i].substring(0, 240) : lines[i]);
                        hits.add(hit);
                    }
                }
                return java.nio.file.FileVisitResult.CONTINUE;
            }
        });
        ProtocolMessage.Result result = ok("Found " + hits.size() + " matches");
        result.setHits(hits);
        return result;
    }

    private ProtocolMessage.Result write(String workspace, ProtocolMessage.Arguments args, boolean overwrite) throws IOException {
        Path path = WorkspaceGuard.requireInside(workspace, args.getPath(), "Path");
        if (args.getContent() == null) {
            return failure("File content is required");
        }
        byte[] bytes = args.getContent().getBytes(StandardCharsets.UTF_8);
        if (bytes.length > maxBytes) {
            return failure("File exceeds the size limit");
        }
        Files.createDirectories(path.getParent());
        if (!overwrite && Files.exists(path)) {
            // Idempotent create: overwrite with the provided content so agent retries do not fail-loop.
            Files.writeString(path, args.getContent(), StandardCharsets.UTF_8);
            return fileResult("CREATE_FILE", path, "Updated existing file");
        }
        Files.writeString(path, args.getContent(), StandardCharsets.UTF_8);
        return fileResult(overwrite ? "WRITE_FILE" : "CREATE_FILE", path, overwrite ? "Updated file" : "Created file");
    }

    private ProtocolMessage.Result patch(String workspace, ProtocolMessage.Arguments args) throws IOException {
        Path path = WorkspaceGuard.requireInside(workspace, args.getPath(), "Path");
        if (args.getFind() == null || args.getFind().isEmpty() || args.getReplace() == null) {
            return failure("Patch requires find and replace text");
        }
        String original = Files.readString(path, StandardCharsets.UTF_8);
        int first = original.indexOf(args.getFind());
        int last = original.lastIndexOf(args.getFind());
        if (first < 0) {
            return failure("Patch text was not found");
        }
        if (first != last) {
            return failure("Patch text is not unique");
        }
        String updated = original.substring(0, first) + args.getReplace() + original.substring(first + args.getFind().length());
        if (updated.getBytes(StandardCharsets.UTF_8).length > maxBytes) {
            return failure("File exceeds the size limit");
        }
        Files.writeString(path, updated, StandardCharsets.UTF_8);
        return fileResult("PATCH_FILE", path, "Patched file");
    }

    private ProtocolMessage.Result move(String workspace, ProtocolMessage.Arguments args) throws IOException {
        Path from = WorkspaceGuard.requireInside(workspace, args.getPath(), "Path");
        Path to = WorkspaceGuard.requireInside(workspace, args.getDestinationPath(), "Destination");
        if (Files.exists(to)) {
            return failure("Destination already exists");
        }
        Files.createDirectories(to.getParent());
        Files.move(from, to);
        return fileResult("MOVE_FILE", to, "Moved file");
    }

    private ProtocolMessage.Result delete(String workspace, ProtocolMessage.Arguments args) throws IOException {
        Path path = WorkspaceGuard.requireInside(workspace, args.getPath(), "Path");
        if (!Files.exists(path, LinkOption.NOFOLLOW_LINKS)) {
            return failure("File does not exist");
        }
        if (Files.isDirectory(path, LinkOption.NOFOLLOW_LINKS)) {
            if (!Boolean.TRUE.equals(args.getRecursive())) {
                return failure("Directory delete requires recursive approval");
            }
            try (Stream<Path> walk = Files.walk(path)) {
                List<Path> paths = walk.sorted(Comparator.reverseOrder()).toList();
                for (Path child : paths) {
                    WorkspaceGuard.requireInside(workspace, child.toString(), "Path");
                    Files.deleteIfExists(child);
                }
            }
        } else {
            Files.delete(path);
        }
        ProtocolMessage.Result result = ok("Deleted " + path.getFileName());
        result.setPath(path.toString());
        ProtocolMessage.FileChanged changed = new ProtocolMessage.FileChanged();
        changed.setPath(path.toString());
        changed.setChangeType("DELETE_FILE");
        result.setSha256(null);
        return result;
    }

    private ProtocolMessage.Result fileResult(String changeType, Path path, String summary) throws IOException {
        ProtocolMessage.Result result = ok(summary);
        result.setPath(path.toString());
        result.setSizeBytes(Files.size(path));
        result.setSha256(Fingerprints.sha256(Files.readAllBytes(path)));
        return result;
    }

    private static boolean isBinary(byte[] bytes) {
        int limit = Math.min(bytes.length, 8000);
        for (int i = 0; i < limit; i++) {
            if (bytes[i] == 0) {
                return true;
            }
        }
        return false;
    }

    private static ProtocolMessage.Result ok(String summary) {
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        result.setSuccess(true);
        result.setSummary(summary);
        return result;
    }

    private static ProtocolMessage.Result failure(String summary) {
        ProtocolMessage.Result result = new ProtocolMessage.Result();
        result.setSuccess(false);
        result.setSummary(summary);
        return result;
    }
}
