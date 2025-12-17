"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./StudentMonthlyCalendar.module.css";
import { buildMonthGrid } from "@/lib/date/monthGrid";
import { studentCalendarConfig } from "@/lib/config/studentCalendar";
import {
  getStudentChecklistStorageKey,
  safeJsonParse,
} from "@/lib/storage/studentChecklist";
import type { StudentChecklistByDate } from "@/types/calendar";

function formatMonthTitle(year: number, monthIndex0: number) {
  // locale = ko-KR, "2025년 12월"
  return new Date(year, monthIndex0, 1).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });
}

function clampChecklist(arr: boolean[] | undefined, size: number) {
  const next = Array.from({ length: size }, (_, i) => Boolean(arr?.[i]));
  return next;
}

export default function StudentMonthlyCalendar({ userId }: { userId: string }) {
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [monthIndex0, setMonthIndex0] = useState(today.getMonth());

  const checklistSize = studentCalendarConfig.maxChecklistItems;
  const checklistLabels = studentCalendarConfig.checklistItems.slice(
    0,
    checklistSize
  );

  const storageKey = useMemo(
    () => getStudentChecklistStorageKey({ userId, year, monthIndex0 }),
    [userId, year, monthIndex0]
  );

  const [loaded, setLoaded] = useState(false);
  const [byDate, setByDate] = useState<StudentChecklistByDate>({});

  const grid = useMemo(
    () => buildMonthGrid(year, monthIndex0),
    [year, monthIndex0]
  );

  // month change -> load from localStorage (SSR-safe)
  useEffect(() => {
    setLoaded(false);
    setByDate({});

    if (typeof window === "undefined") return;
    const parsed = safeJsonParse<StudentChecklistByDate>(
      window.localStorage.getItem(storageKey)
    );
    setByDate(parsed || {});
    setLoaded(true);
  }, [storageKey]);

  // persist
  useEffect(() => {
    if (!loaded) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(byDate));
  }, [byDate, loaded, storageKey]);

  const moveMonth = (delta: number) => {
    setMonthIndex0((m) => {
      const next = m + delta;
      if (next < 0) {
        setYear((y) => y - 1);
        return 11;
      }
      if (next > 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return next;
    });
  };

  const toggle = (iso: string, idx: number) => {
    setByDate((prev) => {
      const current = clampChecklist(
        prev[iso as keyof StudentChecklistByDate],
        checklistSize
      );
      const next = [...current];
      next[idx] = !next[idx];
      return { ...prev, [iso]: next };
    });
  };

  return (
    <section className={styles.wrap} aria-label="월간 달력">
      <div className={styles.header}>
        <div className={styles.title}>
          {formatMonthTitle(year, monthIndex0)}
        </div>
        <div className={styles.navButtons}>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="이전 달"
            onClick={() => moveMonth(-1)}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.navBtn}
            aria-label="다음 달"
            onClick={() => moveMonth(1)}
          >
            ›
          </button>
        </div>
      </div>

      <div className={styles.grid} role="grid" aria-label="달력 그리드">
        {studentCalendarConfig.weekdayLabels.map((w) => (
          <div key={w} className={styles.weekday} role="columnheader">
            {w}
          </div>
        ))}

        {grid.map((cell, i) => {
          const isEmpty = !cell.iso;
          const className = [
            styles.cell,
            isEmpty ? styles.empty : "",
            cell.isToday ? styles.today : "",
          ].join(" ");

          return (
            <div
              key={`${cell.iso ?? "empty"}-${i}`}
              className={className}
              role="gridcell"
            >
              {!isEmpty && (
                <>
                  <div className={styles.dateNum}>{cell.date?.getDate()}</div>
                  <div className={styles.checklist}>
                    {checklistLabels.map((label, idx) => {
                      const checked = Boolean(byDate[cell.iso!]?.[idx]);
                      const inputId = `${cell.iso}-${idx}`;
                      return (
                        <label
                          key={inputId}
                          className={styles.checkItem}
                          htmlFor={inputId}
                        >
                          <input
                            id={inputId}
                            className={styles.checkbox}
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(cell.iso!, idx)}
                          />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.hint}>
        체크 상태는 이 기기 브라우저에 저장돼요.
      </div>
    </section>
  );
}
