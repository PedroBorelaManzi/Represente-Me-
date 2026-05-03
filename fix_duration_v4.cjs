const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const oldOnDrop = \  const onDrop = async (e: React.DragEvent, targetDate: Date, targetHour: number) => {
    e.preventDefault();
    setDragOverInfo(null);
    const id = e.dataTransfer.getData(\"eventId\");
    if (!id) return;
    const isoDate = formatDateLocal(targetDate);
    const newTime = \\\\\\:00 - \\\:00\\\;
    
    // Optimistic update
    const movedEvent = events.find(ev => ev.id === id);
    if (!movedEvent) return;
    
    setEvents(events.map(ev => ev.id === id ? { ...ev, date: isoDate, time: newTime } : ev));
    
    const { error } = await supabase.from(\"appointments\").update({ date: isoDate, time: newTime }).eq(\"id\", id);
    if (error) {
       await loadData(); // Rollback on error
       return;
    }

    // Push updated event to Google
    await pushEventToGoogle(user.id, { ...movedEvent, date: isoDate, time: newTime });
  };\;

const newOnDrop = \  const onDrop = async (e: React.DragEvent, targetDate: Date, targetHour: number) => {
    e.preventDefault();
    setDragOverInfo(null);
    const id = e.dataTransfer.getData(\"eventId\");
    if (!id) return;
    
    const movedEvent = events.find(ev => ev.id === id);
    if (!movedEvent) return;

    const isoDate = formatDateLocal(targetDate);
    
    // Preserve duration
    let newTime = \"\";
    try {
      const parts = movedEvent.time.split(\" - \");
      const startParts = parts[0].split(\":\");
      const endParts = parts[1].split(\":\");
      
      const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1] || \"0\");
      const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1] || \"0\");
      const duration = endMinutes - startMinutes;
      
      const newStartTotalMinutes = targetHour * 60;
      const newEndTotalMinutes = newStartTotalMinutes + duration;
      
      const startH = Math.floor(newStartTotalMinutes / 60);
      const startM = newStartTotalMinutes % 60;
      const endH = Math.floor(newEndTotalMinutes / 60);
      const endM = newEndTotalMinutes % 60;
      
      newTime = \\\\\\:\\\ - \\\:\\\\\\;
    } catch (err) {
      newTime = \\\\\\:00 - \\\:00\\\;
    }

    // Optimistic update
    setEvents(events.map(ev => ev.id === id ? { ...ev, date: isoDate, time: newTime } : ev));
    
    const { error } = await supabase.from(\"appointments\").update({ date: isoDate, time: newTime }).eq(\"id\", id);
    if (error) {
       await loadData(); 
       return;
    }

    await pushEventToGoogle(user.id, { ...movedEvent, date: isoDate, time: newTime });
  };\;

if (content.includes(oldOnDrop)) {
    content = content.replace(oldOnDrop, newOnDrop);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed onDrop');
} else {
    console.error('Could not find oldOnDrop');
    // Try a more relaxed match
}