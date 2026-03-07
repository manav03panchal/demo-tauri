import { useState, useRef, useEffect, useCallback, useMemo, memo, type KeyboardEvent } from "react"
import { Check, Plus, Trash2, GripVertical, Sun, Moon, Filter } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

export interface Todo {
  id: string
  text: string
  completed: boolean
}

export type FilterMode = "all" | "active" | "completed"

const STORAGE_KEY = "notion-todos"

function loadTodos(): Todo[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as unknown
      if (Array.isArray(parsed) && parsed.every(
        (t): t is Todo =>
          typeof t === "object" && t !== null &&
          typeof t.id === "string" &&
          typeof t.text === "string" &&
          typeof t.completed === "boolean"
      )) {
        return parsed
      }
    }
  } catch {
    // ignore corrupt data
  }
  return [
    { id: "1", text: "Welcome to your todo list", completed: false },
    { id: "2", text: "Click to edit a todo", completed: false },
    { id: "3", text: "Click the checkbox to complete", completed: true },
  ]
}

function saveTodos(todos: Todo[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
}

const THEME_KEY = "notion-todo-theme"

function loadDarkMode(): boolean {
  try {
    const stored = localStorage.getItem(THEME_KEY)
    if (stored === "dark") return true
    if (stored === "light") return false
  } catch {
    // ignore
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

const SortableTodoItem = memo(function SortableTodoItem({
  todo,
  onToggle,
  onDelete,
  onUpdate,
}: {
  todo: Todo
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onUpdate: (id: string, text: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)
  const inputRef = useRef<HTMLInputElement>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isEditing])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      commitEdit()
    }
    if (e.key === "Escape") {
      setEditText(todo.text)
      setIsEditing(false)
    }
  }

  const commitEdit = () => {
    const trimmed = editText.trim()
    if (trimmed) {
      onUpdate(todo.id, trimmed)
    } else {
      onDelete(todo.id)
    }
    setIsEditing(false)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
        "hover:bg-muted/60",
        isDragging && "opacity-50 bg-muted/40 shadow-lg z-10"
      )}
    >
      <GripVertical
        className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-40 shrink-0 cursor-grab"
        {...attributes}
        {...listeners}
      />

      <button
        onClick={() => onToggle(todo.id)}
        className={cn(
          "flex items-center justify-center h-[18px] w-[18px] rounded-sm border shrink-0 transition-colors",
          todo.completed
            ? "bg-primary border-primary"
            : "border-border hover:border-foreground/40"
        )}
      >
        {todo.completed && <Check className="h-3 w-3 text-primary-foreground" />}
      </button>

      {isEditing ? (
        <input
          ref={inputRef}
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-[15px] leading-relaxed py-0"
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={cn(
            "flex-1 text-[15px] leading-relaxed cursor-text select-none",
            todo.completed && "line-through text-muted-foreground"
          )}
        >
          {todo.text}
        </span>
      )}

      <button
        onClick={() => onDelete(todo.id)}
        className="opacity-0 group-hover:opacity-100 p-1 rounded transition-all hover:bg-destructive/10 hover:text-destructive shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
})

const ProgressBar = memo(function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100)
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
        <span>{completed} of {total} tasks done</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
})

const FilterTabs = memo(function FilterTabs({
  filter,
  onFilterChange,
}: {
  filter: FilterMode
  onFilterChange: (mode: FilterMode) => void
}) {
  const tabs: { mode: FilterMode; label: string }[] = [
    { mode: "all", label: "All" },
    { mode: "active", label: "Active" },
    { mode: "completed", label: "Completed" },
  ]

  return (
    <div className="flex items-center gap-1 mb-4">
      <Filter className="h-3.5 w-3.5 text-muted-foreground mr-1" />
      {tabs.map(({ mode, label }) => (
        <button
          key={mode}
          onClick={() => onFilterChange(mode)}
          className={cn(
            "px-2.5 py-1 text-xs rounded-md transition-colors",
            filter === mode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
})

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>(loadTodos)
  const [newTodoText, setNewTodoText] = useState("")
  const [dark, setDark] = useState(loadDarkMode)
  const [filter, setFilter] = useState<FilterMode>("all")
  const newTodoRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    saveTodos(todos)
  }, [todos])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark)
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light")
  }, [dark])

  // Global keyboard shortcut: Ctrl/Cmd+K to focus new todo input
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        newTodoRef.current?.focus()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const addTodo = useCallback(() => {
    const trimmed = newTodoText.trim()
    if (!trimmed) return
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmed, completed: false },
    ])
    setNewTodoText("")
    newTodoRef.current?.focus()
  }, [newTodoText])

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }, [])

  const deleteTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const updateTodo = useCallback((id: string, text: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text } : t))
    )
  }, [])

  const clearCompleted = useCallback(() => {
    setTodos((prev) => prev.filter((t) => !t.completed))
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setTodos((prev) => {
        const oldIndex = prev.findIndex((t) => t.id === active.id)
        const newIndex = prev.findIndex((t) => t.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }, [])

  const handleNewTodoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      addTodo()
    }
  }

  const completedCount = useMemo(() => todos.filter((t) => t.completed).length, [todos])
  const activeCount = todos.length - completedCount

  const filteredTodos = useMemo(() => todos.filter((t) => {
    if (filter === "active") return !t.completed
    if (filter === "completed") return t.completed
    return true
  }), [todos, filter])

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Todo</h1>
        <button
          onClick={() => setDark((d) => !d)}
          className="p-2 rounded-md transition-colors hover:bg-muted"
          aria-label="Toggle dark mode"
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <ProgressBar completed={completedCount} total={todos.length} />

      <FilterTabs filter={filter} onFilterChange={setFilter} />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={filteredTodos.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-0.5">
            {filteredTodos.map((todo) => (
              <SortableTodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleTodo}
                onDelete={deleteTodo}
                onUpdate={updateTodo}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {filteredTodos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {filter === "all"
            ? "No tasks yet. Add one below!"
            : filter === "active"
            ? "No active tasks. Great job!"
            : "No completed tasks yet."}
        </div>
      )}

      <div className="flex items-center gap-2 px-2 py-1.5 mt-1 rounded-md group">
        <div className="h-4 w-4 shrink-0" />
        <button
          onClick={() => newTodoRef.current?.focus()}
          className="flex items-center justify-center h-[18px] w-[18px] rounded-sm shrink-0 text-muted-foreground/60"
        >
          <Plus className="h-4 w-4" />
        </button>
        <input
          ref={newTodoRef}
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyDown={handleNewTodoKeyDown}
          placeholder="Add a todo..."
          className="flex-1 bg-transparent outline-none text-[15px] leading-relaxed placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {activeCount} task{activeCount !== 1 ? "s" : ""} remaining
        </span>
        {completedCount > 0 && (
          <button
            onClick={clearCompleted}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear completed ({completedCount})
          </button>
        )}
      </div>

      <div className="mt-3 text-center">
        <span className="text-[11px] text-muted-foreground/50">
          Ctrl+K to quick-add
        </span>
      </div>
    </div>
  )
}
