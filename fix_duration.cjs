const fs = require('fs');
const file = 'src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Helper function to calculate duration and new time
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
      
      newTime = \\:\ - \:\\;
    } catch (err) {
      // Fallback to 1 hour if parsing fails
      newTime = \\:00 - \:00\;
    }

    // Optimistic update
    setEvents(events.map(ev => ev.id === id ? { ...ev, date: isoDate, time: newTime } : ev));
    
    const { error } = await supabase.from(\"appointments\").update({ date: isoDate, time: newTime }).eq(\"id\", id);
    if (error) {
       await loadData(); // Rollback on error
       return;
    }

    // Push updated event to Google
    await pushEventToGoogle(user.id, { ...movedEvent, date: isoDate, time: newTime });
  };\;

// Replace the old onDrop
const onDropOldRegex = /const onDrop = async \(e: React\.DragEvent, targetDate: Date, targetHour: number\) => \{[\s\S]*?\};/;
content = content.replace(onDropOldRegex, newOnDrop);

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed onDrop duration preservation in Dashboard.tsx');