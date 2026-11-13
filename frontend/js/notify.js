const Notify = {
  supported: 'Notification' in window,

  async enable() {
    if (!this.supported) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  },

  schedule(reg, event) {
    if (!this.supported || Notification.permission !== 'granted') return;
    const when = ICS.parseDate(event).getTime();
    const dayBefore = when - 24 * 60 * 60 * 1000;
    if (dayBefore > Date.now()) {
      setTimeout(() => {
        this.show('Przypomnienie o wydarzeniu', `${event.title} – jutro, godz. ${event.time}, ${event.location}`);
      }, Math.min(dayBefore - Date.now(), 2 ** 31 - 1));
    }
    if (when - 2 * 60 * 60 * 1000 > Date.now()) {
      setTimeout(() => {
        this.show('Za 2 godziny wydarzenie TCUS', `${event.title}, ${event.location}`);
      }, Math.min(when - 2 * 60 * 60 * 1000 - Date.now(), 2 ** 31 - 1));
    }
  },

  show(title, body) {
    if (!this.supported || Notification.permission !== 'granted') return;
    new Notification(title, { body, icon: 'icons/icon-192.png', tag: `tcus-${title}` });
  }
};
