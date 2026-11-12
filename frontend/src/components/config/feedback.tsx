interface Props {
  error: string | null;
  ok: string | null;
}

function Feedback({ error, ok }: Props) {
  if (!error && !ok) return null;
  return (
    <p
      role={error ? "alert" : "status"}
      className={"text-[13px] " + (error ? "text-red-400" : "text-emerald-400")}
    >
      {error ?? ok}
    </p>
  );
}

export default Feedback;