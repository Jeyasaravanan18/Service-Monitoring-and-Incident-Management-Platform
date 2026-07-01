import React from "react";
import { useEffect, useMemo, useState } from "react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../lib/api.js";
import { HealthPill } from "./HealthPill.jsx";
import { Panel, PageHeader, Topbar } from "./Layout.jsx";

const emptyValueByType = {
  text: "",
  number: "",
  textarea: "",
  select: "",
  checkbox: false,
  array: "",
  json: "{}",
  date: "",
};

function serializeFormValue(value, type) {
  if (type === "checkbox") return Boolean(value);
  if (type === "number") return value === "" || value == null ? "" : Number(value);
  if (type === "array") {
    if (Array.isArray(value)) return value.join(", ");
    return value || "";
  }
  if (type === "json") {
    if (typeof value === "string") return value;
    return JSON.stringify(value ?? {}, null, 2);
  }
  if (type === "date") {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 16);
  }
  return value == null ? "" : String(value);
}

function parseFormValue(value, field) {
  if (field.type === "checkbox") return Boolean(value);
  if (field.type === "number") {
    if (value === "") return "";
    const parsed = Number(value);
    return Number.isNaN(parsed) ? "" : parsed;
  }
  if (field.type === "array") {
    return String(value)
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (field.type === "json") {
    if (!String(value).trim()) return {};
    try {
      return JSON.parse(value);
    } catch {
      throw new Error(`${field.label} must be valid JSON`);
    }
  }
  if (field.type === "date") {
    return value ? new Date(value).toISOString() : "";
  }
  return value;
}

function buildInitialForm(fields, item) {
  return fields.reduce((acc, field) => {
    const raw = item?.[field.key];
    acc[field.key] = serializeFormValue(
      raw === undefined ? emptyValueByType[field.type || "text"] : raw,
      field.type || "text"
    );
    return acc;
  }, {});
}

function formatCellValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function ResourceManagementPage({
  title,
  copy,
  endpoint,
  columns = [],
  fields = [],
  createLabel,
  updateLabel,
  badgeField,
  itemLabel = "item",
  mapCreate = (payload) => payload,
  mapUpdate = (payload) => payload,
  createEndpoint = endpoint,
  updateEndpoint = (item) => `${endpoint}/${item._id}`,
  deleteEndpoint = (item) => `${endpoint}/${item._id}`,
  extraSummary,
  listFilters = [],
  disableCreate = false,
  disableEdit = false,
  disableDelete = false,
}) {
  const [state, setState] = useState({ loading: true, error: "", data: [] });
  const [filterForm, setFilterForm] = useState(() => buildInitialForm(listFilters));
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");

  const formTitle = editing ? `${updateLabel || `Edit ${itemLabel}`}` : `${createLabel || `Create ${itemLabel}`}`;
  const buttonLabel = editing ? (updateLabel || "Save changes") : (createLabel || `Create ${itemLabel}`);

  const refresh = async (activeFilters = filterForm) => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const params = new URLSearchParams();
      for (const field of listFilters) {
        const parsed = parseFormValue(activeFilters[field.key], field);
        if (parsed === "" || parsed === null || parsed === undefined) continue;
        if (Array.isArray(parsed)) {
          if (parsed.length) params.set(field.key, parsed.join(","));
          continue;
        }
        if (typeof parsed === "object") {
          params.set(field.key, JSON.stringify(parsed));
          continue;
        }
        params.set(field.key, String(parsed));
      }
      const response = await apiGet(params.toString() ? `${endpoint}?${params.toString()}` : endpoint);
      setState({ loading: false, error: "", data: response.data || [] });
    } catch (error) {
      setState({ loading: false, error: error.message, data: [] });
    }
  };

  useEffect(() => {
    const initialFilters = buildInitialForm(listFilters);
    setFilterForm(initialFilters);
    refresh(initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint]);

  const summary = useMemo(() => {
    if (typeof extraSummary === "function") {
      return extraSummary(state.data);
    }
    return null;
  }, [extraSummary, state.data]);

  const startCreate = () => {
    setEditing(null);
    setSaveError("");
    setNotice("");
    setForm(buildInitialForm(fields));
  };

  const startEdit = (item) => {
    setEditing(item);
    setSaveError("");
    setNotice("");
    setForm(buildInitialForm(fields, item));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setSaveError("");
    setNotice("");
    try {
      const payload = fields.reduce((acc, field) => {
        acc[field.key] = parseFormValue(form[field.key], field);
        return acc;
      }, {});

      const body = editing ? mapUpdate(payload, editing) : mapCreate(payload);
      if (editing) {
        const response = await apiPatch(updateEndpoint(editing), body);
        if (response?.data?.plainKey) {
          setNotice(`New API key: ${response.data.plainKey}`);
        }
      } else {
        const response = await apiPost(createEndpoint, body);
        if (response?.data?.plainKey) {
          setNotice(`New API key: ${response.data.plainKey}`);
        } else if (response?.data?.message) {
          setNotice(response.data.message);
        }
      }
      setEditing(null);
      setForm({});
      await refresh();
    } catch (error) {
      setSaveError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete this ${itemLabel}?`)) return;
    setSaveError("");
    try {
      await apiDelete(deleteEndpoint(item));
      if (editing?._id === item._id) {
        setEditing(null);
        setForm({});
      }
      await refresh();
    } catch (error) {
      setSaveError(error.message);
    }
  };

  return (
    <>
      <Topbar />
      <PageHeader
        title={title}
        copy={copy}
        action={
          <div className="button-row">
            <button className="button" type="button" onClick={refresh}>
              Refresh
            </button>
            {!disableCreate ? (
              <button className="button primary" type="button" onClick={startCreate}>
                New {itemLabel}
              </button>
            ) : null}
          </div>
        }
      />
      {summary ? (
        <div className="grid cols-3" style={{ marginBottom: 16 }}>
          {summary}
        </div>
      ) : null}
      <div className="grid cols-2">
        <Panel title={`${title} records`}>
          {listFilters.length ? (
            <>
              <div className="grid cols-3" style={{ gap: 12, marginBottom: 16 }}>
                {listFilters.map((field) => {
                  const value = filterForm[field.key] ?? emptyValueByType[field.type || "text"];
                  const common = {
                    className: "search",
                    value,
                    onChange: (event) => setFilterForm((current) => ({ ...current, [field.key]: event.target.value })),
                    placeholder: field.placeholder || field.label,
                  };

                  if (field.type === "checkbox") {
                    return (
                      <label key={field.key} className="field-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(value)}
                          onChange={(event) => setFilterForm((current) => ({ ...current, [field.key]: event.target.checked }))}
                        />
                        <span>
                          <strong>{field.label}</strong>
                          {field.help ? <div className="subtle">{field.help}</div> : null}
                        </span>
                      </label>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <label key={field.key} className="field-block">
                        <span className="field-label">{field.label}</span>
                        <select
                          className="search"
                          value={value}
                          onChange={(event) => setFilterForm((current) => ({ ...current, [field.key]: event.target.value }))}
                        >
                          <option value="">All {field.label}</option>
                          {(field.options || []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {field.help ? <span className="subtle">{field.help}</span> : null}
                      </label>
                    );
                  }

                  return (
                    <label key={field.key} className="field-block">
                      <span className="field-label">{field.label}</span>
                      <input
                        {...common}
                        type={field.type === "number" ? "number" : "text"}
                        step={field.step || (field.type === "number" ? "any" : undefined)}
                      />
                      {field.help ? <span className="subtle">{field.help}</span> : null}
                    </label>
                  );
                })}
              </div>
              <div className="button-row" style={{ marginBottom: 16 }}>
                <button className="button" type="button" onClick={() => refresh(filterForm)}>
                  Apply filters
                </button>
                <button
                  className="button"
                  type="button"
                  onClick={() => {
                    const cleared = buildInitialForm(listFilters);
                    setFilterForm(cleared);
                    refresh(cleared);
                  }}
                >
                  Clear filters
                </button>
              </div>
            </>
          ) : null}
          {state.loading ? <div className="subtle">Loading workspace data...</div> : null}
          {state.error ? <div className="subtle">{state.error}</div> : null}
          {!state.loading && !state.error ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                    {!disableEdit || !disableDelete ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {state.data.map((row) => (
                    <tr key={row._id || row.id || JSON.stringify(row)}>
                      {columns.map((column) => (
                        <td key={column.key}>
                          {column.key === badgeField ? (
                            <HealthPill value={row[column.key]} />
                          ) : column.render ? (
                            column.render(row)
                          ) : (
                            formatCellValue(row[column.key])
                          )}
                        </td>
                      ))}
                      {!disableEdit || !disableDelete ? (
                        <td>
                          <div className="button-row" style={{ flexWrap: "nowrap" }}>
                            {!disableEdit ? (
                              <button className="button" type="button" onClick={() => startEdit(row)}>
                                Edit
                              </button>
                            ) : null}
                            {!disableDelete ? (
                              <button className="button" type="button" onClick={() => handleDelete(row)}>
                                Delete
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {!state.loading && !state.error && !state.data.length ? (
            <div className="subtle" style={{ marginTop: 12 }}>
              No {title.toLowerCase()} found in this workspace.
            </div>
          ) : null}
        </Panel>

        <Panel title={formTitle}>
          <form className="grid" style={{ gap: 12 }} onSubmit={handleSubmit}>
            {fields.map((field) => {
              const value = form[field.key] ?? emptyValueByType[field.type || "text"];
              const common = {
                className: "search",
                value,
                onChange: (event) => setForm((current) => ({ ...current, [field.key]: event.target.value })),
                placeholder: field.placeholder || field.label,
              };

              if (field.type === "checkbox") {
                return (
                  <label key={field.key} className="field-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.checked }))}
                    />
                    <span>
                      <strong>{field.label}</strong>
                      {field.help ? <div className="subtle">{field.help}</div> : null}
                    </span>
                  </label>
                );
              }

              if (field.type === "textarea" || field.type === "json") {
                return (
                  <label key={field.key} className="field-block">
                    <span className="field-label">{field.label}</span>
                    <textarea {...common} rows={field.type === "json" ? 6 : 4} style={{ resize: "vertical" }} />
                    {field.help ? <span className="subtle">{field.help}</span> : null}
                  </label>
                );
              }

              if (field.type === "select") {
                return (
                  <label key={field.key} className="field-block">
                    <span className="field-label">{field.label}</span>
                    <select
                      className="search"
                      value={value}
                      onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                    >
                      <option value="">Select {field.label}</option>
                      {(field.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {field.help ? <span className="subtle">{field.help}</span> : null}
                  </label>
                );
              }

              return (
                <label key={field.key} className="field-block">
                  <span className="field-label">{field.label}</span>
                  <input
                    {...common}
                    type={field.type === "number" ? "number" : field.type === "date" ? "datetime-local" : "text"}
                    step={field.step || (field.type === "number" ? "any" : undefined)}
                  />
                  {field.help ? <span className="subtle">{field.help}</span> : null}
                </label>
              );
            })}
            {disableCreate && !editing ? <div className="subtle">Create is disabled for this screen.</div> : null}
            {notice ? <div className="subtle">{notice}</div> : null}
            {saveError ? <div className="subtle">{saveError}</div> : null}
            {!disableCreate || editing ? (
              <div className="button-row">
                <button className="button primary" type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : buttonLabel}
                </button>
                {editing ? (
                  <button
                    className="button"
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setForm({});
                      setSaveError("");
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            ) : null}
          </form>
        </Panel>
      </div>
    </>
  );
}
