export function normalizeVersions(message) {
  if (message.versions?.length) {
    return {
      versions: message.versions,
      activeVersionIndex:
        message.activeVersionIndex ?? Math.max(0, message.versions.length - 1),
    };
  }

  return {
    versions: [
      {
        content: message.text ?? message.content ?? "",
        citations: message.citations ?? [],
      },
    ],
    activeVersionIndex: 0,
  };
}

export function getActiveVersion(message) {
  const { versions, activeVersionIndex } = normalizeVersions(message);
  const index = Math.min(Math.max(activeVersionIndex, 0), versions.length - 1);
  return { version: versions[index], index, versions };
}
