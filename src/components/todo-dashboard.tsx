"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createTodo,
  deleteTodo,
  getTodos,
  Todo,
  updateTodo,
} from "@/lib/api";

export default function TodoDashboard() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  async function loadTodos() {
    try {
      setError("");

      const data = await getTodos();

      setTodos(data);
    } catch {
      setError("Failed to load todos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTodos();
  }, []);

  async function handleCreateTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const todo = await createTodo({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      setTodos((current) => [todo, ...current]);

      setTitle("");
      setDescription("");
    } catch {
      setError("Failed to create todo");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleTodo(todo: Todo) {
    try {
      setError("");

      const updatedTodo = await updateTodo(todo.id, {
        title: todo.title,
        description: todo.description,
        completed: !todo.completed,
      });

      setTodos((current) =>
        current.map((item) =>
          item.id === updatedTodo.id ? updatedTodo : item,
        ),
      );
    } catch {
      setError("Failed to update todo");
    }
  }

  function handleStartEdit(todo: Todo) {
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditDescription(todo.description ?? "");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function handleUpdateTodo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingId || !editTitle.trim()) {
      return;
    }

    const currentTodo = todos.find(
      (todo) => todo.id === editingId,
    );

    if (!currentTodo) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      const updatedTodo = await updateTodo(editingId, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        completed: currentTodo.completed,
      });

      setTodos((current) =>
        current.map((todo) =>
          todo.id === updatedTodo.id ? updatedTodo : todo,
        ),
      );

      handleCancelEdit();
    } catch {
      setError("Failed to update todo");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteTodo(id: number) {
    try {
      setError("");

      await deleteTodo(id);

      setTodos((current) =>
        current.filter((todo) => todo.id !== id),
      );
    } catch {
      setError("Failed to delete todo");
    }
  }

  const total = todos.length;

  const completed = todos.filter(
    (todo) => todo.completed,
  ).length;

  const pending = total - completed;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Todo Dashboard
          </h1>

          <p className="mt-2 text-slate-500">
            Simple Todo management with Go API + PostgreSQL
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Total" value={total} />

          <StatCard label="Completed" value={completed} />

          <StatCard label="Pending" value={pending} />
        </div>

        {/* Add Todo */}
        <form
          onSubmit={handleCreateTodo}
          className="mb-6 rounded-xl bg-white p-6 shadow-sm"
        >
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            Add Todo
          </h2>

          <div className="space-y-3">
            <input
              type="text"
              placeholder="What needs to be done?"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={3}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-5 py-3 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Todo"}
            </button>
          </div>
        </form>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Todo List */}
        <div className="rounded-xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="font-semibold text-slate-900">
              Todo List
            </h2>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {completed} / {total}
            </span>
          </div>

          {loading ? (
            <div className="p-6 text-slate-500">
              Loading todos...
            </div>
          ) : todos.length === 0 ? (
            <div className="p-10 text-center text-slate-500">
              No todos yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start justify-between gap-4 px-6 py-5"
                >
                  {editingId === todo.id ? (
                    /* Edit mode */
                    <form
                      onSubmit={handleUpdateTodo}
                      className="flex-1 space-y-3"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(event) =>
                          setEditTitle(event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      />

                      <textarea
                        value={editDescription}
                        onChange={(event) =>
                          setEditDescription(event.target.value)
                        }
                        rows={2}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                      />

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={saving}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>

                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      {/* Todo content */}
                      <div className="flex min-w-0 flex-1 gap-4">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() =>
                            handleToggleTodo(todo)
                          }
                          className="mt-1 h-5 w-5 shrink-0"
                        />

                        <div className="min-w-0">
                          <h3
                            className={`font-medium ${
                              todo.completed
                                ? "text-slate-400 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {todo.title}
                          </h3>

                          {todo.description && (
                            <p className="mt-1 text-sm text-slate-500">
                              {todo.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleStartEdit(todo)
                          }
                          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Update
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteTodo(todo.id)
                          }
                          className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}