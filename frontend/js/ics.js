const ICS = {
  parseDate(event) {
    const [d, m, y] = String(event.date).split('/').map(Number);
    const [h, min] = String(event.time || '12:00').split(':').map(Number);
    return new Date(y, m - 1, d, h || 0, min || 0);
  },

  stamp(date) {
    const p = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}T${p(date.getHours())}${p(date.getMinutes())}00`;
  },

  download(event) {
    const start = this.parseDate(event);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TCUS Torun//Wydarzenia//PL',
      'BEGIN:VEVENT',
      `UID:${event.id}@tcus.torun.pl`,
      `DTSTAMP:${this.stamp(new Date())}`,
      `DTSTART:${this.stamp(start)}`,
      `DTEND:${this.stamp(end)}`,
      `SUMMARY:${event.title}`,
      `LOCATION:${event.location || ''}`,
      `DESCRIPTION:${(event.description || '').replace(/\r?\n/g, '\\n').slice(0, 800)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT24H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Przypomnienie o wydarzeniu TCUS',
      'END:VALARM',
      'BEGIN:VALARM',
      'TRIGGER:-PT2H',
      'ACTION:DISPLAY',
      'DESCRIPTION:Za 2 godziny wydarzenie TCUS',
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tcus-${event.id}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
};
