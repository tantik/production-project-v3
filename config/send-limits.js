export const defaultSendLimits = {
  dry_run: {
    dailyTotal: 50,
    perChannel: {
      instagram_dm: 30,
      line: 30,
      email: 50
    },
    minHoursBetweenMessagesToSameLead: 24
  },
  live: {
    dailyTotal: 20,
    perChannel: {
      instagram_dm: 10,
      line: 10,
      email: 20
    },
    minHoursBetweenMessagesToSameLead: 48
  }
};

export function getSendLimits(mode = 'dry_run') {
  return defaultSendLimits[mode] || defaultSendLimits.dry_run;
}
