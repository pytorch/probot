export function parseSubscriptions(rawSubsText): object {
  const subsText = rawSubsText.replace('\r', '');
  const subsRows = subsText.match(/^\*.+/gm);
  const subscriptions = {};
  if (subsRows == null) {
    return subscriptions;
  }
  // eslint-disable-next-line github/array-foreach
  subsRows.forEach((row: string) => {
    const labelMatch = row.match(/^\* +([^@]+)/);
    if (labelMatch) {
      const label = labelMatch[1].trim();
      const users = row.match(/@[a-zA-Z0-9-/]+/g);
      if (users) {
        subscriptions[label] = users.map(u => u.substring(1));
      }
    }
  });
  return subscriptions;
}
