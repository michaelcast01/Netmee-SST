type FlashMessageProps = {
  error?: string;
  success?: string;
};

export function FlashMessage({ error, success }: FlashMessageProps) {
  if (!error && !success) return null;
  if (error) {
    return (
      <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
        {error}
      </div>
    );
  }
  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
      {success}
    </div>
  );
}
