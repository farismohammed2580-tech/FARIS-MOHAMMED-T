/**
 * Billing Cycle & Dubai Timezone Utilities for WIN WHITE LAUNDRY
 * Handles customer-specific billing cycles (e.g. 1st-30th, 15th-14th, 25th-24th)
 * with accurate month-end, year-end, and Asia/Dubai timezone computations.
 */

export interface CycleRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  label: string; // e.g. "15 Oct 2026 – 14 Nov 2026"
  startDay: number;
  endDay: number;
}

/**
 * Get current date parts in Asia/Dubai timezone (UTC+4)
 */
export function getDubaiDate(inputDate?: Date | string): {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hours: number;
  minutes: number;
  dateString: string; // YYYY-MM-DD
  timeString: string; // HH:mm
  isoDubai: string;
} {
  const d = inputDate
    ? typeof inputDate === 'string'
      ? new Date(inputDate)
      : inputDate
    : new Date();

  // Format into Dubai timezone
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(d);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = parseInt(partMap['year'] || '2026', 10);
  const month = parseInt(partMap['month'] || '10', 10);
  const day = parseInt(partMap['day'] || '27', 10);
  const hours = parseInt(partMap['hour'] || '12', 10);
  const minutes = parseInt(partMap['minute'] || '00', 10);

  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const isoDubai = `${dateString}T${timeString}:00+04:00`;

  return { year, month, day, hours, minutes, dateString, timeString, isoDubai };
}

/**
 * Format a YYYY-MM-DD string into readable English (e.g. 15 Oct 2026)
 */
export function formatDubaiDateDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return dateStr;

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  return `${d} ${months[m - 1]} ${y}`;
}

/**
 * Get the number of days in a specific year and month
 */
export function getDaysInMonth(year: number, month: number): number {
  // month is 1-12. Day 0 of month+1 gives last day of month
  return new Date(year, month, 0).getDate();
}

/**
 * Pad numbers with leading zero
 */
function pad2(num: number): string {
  return String(num).padStart(2, '0');
}

/**
 * Compute the precise billing cycle ranges (Current, Previous, and Next Billing Date)
 * for a customer based on their configured cycle start day (1 to 28).
 *
 * Rules:
 * - If cycleStartDay === 1:
 *   Current cycle is from 1st of current month to last day of current month.
 *   Previous cycle is 1st of previous month to last day of previous month.
 *   Next billing date is the last day of the current month.
 *
 * - If cycleStartDay > 1 (e.g. 15):
 *   If today is on or after cycleStartDay (e.g. 27th >= 15th):
 *     Current cycle started on Year-Month-15 and ends on NextMonth-14.
 *     Previous cycle was PrevMonth-15 to Year-Month-14.
 *     Next billing date is NextMonth-14.
 *   If today is before cycleStartDay (e.g. 10th < 15th):
 *     Current cycle started on PrevMonth-15 and ends on Year-Month-14.
 *     Previous cycle was MonthBeforePrev-15 to PrevMonth-14.
 *     Next billing date is Year-Month-14.
 */
export function getCustomerBillingCycle(
  cycleStartDay: number = 1,
  referenceDate?: Date | string
): {
  currentCycle: CycleRange;
  previousCycle: CycleRange;
  nextBillingDate: string; // YYYY-MM-DD
  cycleSummary: string; // e.g. "15th to 14th of each month" or "1st to 30th/31st of each month"
} {
  const safeStartDay = Math.min(28, Math.max(1, Math.floor(cycleStartDay || 1)));
  const ref = getDubaiDate(referenceDate);

  if (safeStartDay === 1) {
    // Standard calendar month cycle: 1st to end of month
    const curYear = ref.year;
    const curMonth = ref.month;
    const curDays = getDaysInMonth(curYear, curMonth);

    const curStart = `${curYear}-${pad2(curMonth)}-01`;
    const curEnd = `${curYear}-${pad2(curMonth)}-${pad2(curDays)}`;

    // Previous calendar month
    let prevYear = curYear;
    let prevMonth = curMonth - 1;
    if (prevMonth < 1) {
      prevMonth = 12;
      prevYear -= 1;
    }
    const prevDays = getDaysInMonth(prevYear, prevMonth);
    const prevStart = `${prevYear}-${pad2(prevMonth)}-01`;
    const prevEnd = `${prevYear}-${pad2(prevMonth)}-${pad2(prevDays)}`;

    return {
      currentCycle: {
        startDate: curStart,
        endDate: curEnd,
        label: `${formatDubaiDateDisplay(curStart)} – ${formatDubaiDateDisplay(curEnd)}`,
        startDay: 1,
        endDay: curDays,
      },
      previousCycle: {
        startDate: prevStart,
        endDate: prevEnd,
        label: `${formatDubaiDateDisplay(prevStart)} – ${formatDubaiDateDisplay(prevEnd)}`,
        startDay: 1,
        endDay: prevDays,
      },
      nextBillingDate: curEnd,
      cycleSummary: '1st to end of month',
    };
  }

  // Staggered cycle (e.g. 15th to 14th or 25th to 24th)
  let startYear = ref.year;
  let startMonth = ref.month;

  if (ref.day < safeStartDay) {
    // Current date is before the cycle start day, so cycle started in previous month
    startMonth -= 1;
    if (startMonth < 1) {
      startMonth = 12;
      startYear -= 1;
    }
  }

  // End of current cycle is (safeStartDay - 1) of the month following startMonth
  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 12) {
    endMonth = 1;
    endYear += 1;
  }
  const endDay = safeStartDay - 1;

  const curStart = `${startYear}-${pad2(startMonth)}-${pad2(safeStartDay)}`;
  const curEnd = `${endYear}-${pad2(endMonth)}-${pad2(endDay)}`;

  // Previous cycle is 1 month earlier
  let prevStartYear = startYear;
  let prevStartMonth = startMonth - 1;
  if (prevStartMonth < 1) {
    prevStartMonth = 12;
    prevStartYear -= 1;
  }

  const prevEndYear = startYear;
  const prevEndMonth = startMonth;
  const prevEndDay = endDay;

  const prevStart = `${prevStartYear}-${pad2(prevStartMonth)}-${pad2(safeStartDay)}`;
  const prevEnd = `${prevEndYear}-${pad2(prevEndMonth)}-${pad2(prevEndDay)}`;

  const suffix = (d: number) => {
    if (d === 1 || d === 21 || d === 31) return `${d}st`;
    if (d === 2 || d === 22) return `${d}nd`;
    if (d === 3 || d === 23) return `${d}rd`;
    return `${d}th`;
  };

  return {
    currentCycle: {
      startDate: curStart,
      endDate: curEnd,
      label: `${formatDubaiDateDisplay(curStart)} – ${formatDubaiDateDisplay(curEnd)}`,
      startDay: safeStartDay,
      endDay,
    },
    previousCycle: {
      startDate: prevStart,
      endDate: prevEnd,
      label: `${formatDubaiDateDisplay(prevStart)} – ${formatDubaiDateDisplay(prevEnd)}`,
      startDay: safeStartDay,
      endDay: prevEndDay,
    },
    nextBillingDate: curEnd,
    cycleSummary: `${suffix(safeStartDay)} to ${suffix(endDay)} of following month`,
  };
}

/**
 * Check if a given date falls within the cycle range [startDate, endDate] inclusive
 */
export function isInvoiceInCycle(
  invoiceDate: string,
  cycleStartDate: string,
  cycleEndDate: string
): boolean {
  if (!invoiceDate || !cycleStartDate || !cycleEndDate) return false;
  const invDay = invoiceDate.slice(0, 10);
  const startDay = cycleStartDate.slice(0, 10);
  const endDay = cycleEndDate.slice(0, 10);

  return invDay >= startDay && invDay <= endDay;
}

/**
 * Generate a standard statement sequence number
 */
export function generateStatementNumber(customerCode: string, cycleEndDate: string): string {
  const cleanCode = (customerCode || 'MC').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const dateParts = cycleEndDate.slice(0, 10).replace(/-/g, '');
  return `STMT-${dateParts}-${cleanCode}`;
}
