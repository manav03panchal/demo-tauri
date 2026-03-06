import { useState, useRef, useEffect, type KeyboardEvent } from "react"
import { Check, Plus, Trash2, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

interface Todo {
  id: string
  text: string
  completed: boolean
}

function TodoItem({
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
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors",
        "hover:bg-muted/60"
      )}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-40 shrink-0 cursor-grab" />

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
}

export default function TodoApp() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: "1", text: "Welcome to your todo list", completed: false },
    { id: "2", text: "Click to edit a todo", completed: false },
    { id: "3", text: "Click the checkbox to complete", completed: true },
  ])
  const [newTodoText, setNewTodoText] = useState("")
  const newTodoRef = useRef<HTMLInputElement>(null)

  const addTodo = () => {
    const trimmed = newTodoText.trim()
    if (!trimmed) return
    setTodos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: trimmed, completed: false },
    ])
    setNewTodoText("")
    newTodoRef.current?.focus()
  }

  const toggleTodo = (id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    )
  }

  const deleteTodo = (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const updateTodo = (id: string, text: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, text } : t))
    )
  }

  const handleNewTodoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      addTodo()
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Todo</h1>

      <div className="space-y-0.5">
        {todos.map((todo) => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={toggleTodo}
            onDelete={deleteTodo}
            onUpdate={updateTodo}
          />
        ))}
      </div>

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
    </div>
  )
}
