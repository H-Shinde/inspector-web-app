// Shared part helpers. A part is "completed" when every field below is filled
// (people can type N/A for fields that don't apply). Change the rule here and the whole app follows.
export const FIELDS = [
  ["qty", "QTY"], ["type", "Type"], ["make", "Make"], ["model", "Model"],
  ["serial", "Serial #"], ["condition", "Condition"], ["year", "Year"], ["mileage", "Mileage"],
];

export const emptyPart = () => ({
  id: `p${Date.now()}`, name: "", qty: "", type: "", make: "", model: "",
  serial: "", condition: "", year: "", mileage: "", comments: "", photos: [],
});

export function partStatus(p) {
  const filled = FIELDS.filter(([k]) => String(p[k] ?? "").trim()).length;
  if (filled === 0) return "todo";
  return filled === FIELDS.length ? "completed" : "in-progress";
}

export const STATUS_LABEL = { completed: "Completed", "in-progress": "In progress", todo: "To-do" };