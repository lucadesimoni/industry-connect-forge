/** Public test traffic is never mapped to plant nodes or saved as asset data. */
export const PUBLIC_SAMPLE_URL = 'wss://test.mosquitto.org:8081/mqtt';
export const PUBLIC_SAMPLE_TOPIC = '$SYS/broker/uptime';

export function validateSampleTopic(topic: string): string | null {
  if (!topic.trim() || topic !== topic.trim() || /[+#\s]/.test(topic) || topic.includes(String.fromCharCode(0)) || topic.split('/').some(level => !level)) {
    return 'Enter one exact topic, without spaces, empty levels or wildcards.';
  }
  return null;
}