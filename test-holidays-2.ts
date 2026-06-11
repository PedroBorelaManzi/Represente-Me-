import { fetchHolidays } from './src/lib/holidayService';

async function test() {
  const locations = [{ city: 'Porto Feliz', state: 'SP' }];
  const holidays = await fetchHolidays(2026, locations);
  console.log(holidays.filter(h => h.type === 'municipal'));
}

test();
