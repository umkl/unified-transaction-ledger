export const cleanJson = (msg: string) => {
  const start = msg.indexOf("{");
  const end = msg.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    return msg.slice(start, end + 1);
  }
  return "{}";
};
