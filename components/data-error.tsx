"use client";

import { catchError, type ErrorInfo } from "next/error";

function DataErrorFallback(
  _props: Record<string, unknown>,
  { retry }: ErrorInfo,
) {
  return (
    <div className="data-error" role="alert">
      <p className="pixel neon-magenta">NO SE PUDIERON CARGAR LOS DATOS.</p>
      <button type="button" className="btn yellow" onClick={() => retry()}>
        REINTENTAR
      </button>
    </div>
  );
}

/** Wrap any server-rendered area that reads from the database. */
export const DataErrorBoundary = catchError(DataErrorFallback);
