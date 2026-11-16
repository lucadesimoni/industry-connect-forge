/** Icon colour for a tracked asset's quality state. */
export const qualityClass = (quality: string) =>
  quality === 'blocked' ? 'text-destructive' : quality === 'warning' ? 'text-yellow-500' : 'text-green-500';
