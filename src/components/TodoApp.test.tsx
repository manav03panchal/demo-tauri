import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import TodoApp from "./TodoApp"

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove("dark")
})

describe("TodoApp", () => {
  it("renders default todos when localStorage is empty", () => {
    render(<TodoApp />)
    expect(screen.getByText("Welcome to your todo list")).toBeInTheDocument()
    expect(screen.getByText("Click to edit a todo")).toBeInTheDocument()
    expect(screen.getByText("Click the checkbox to complete")).toBeInTheDocument()
  })

  it("adds a new todo on Enter", () => {
    render(<TodoApp />)
    const input = screen.getByPlaceholderText("Add a todo...")
    fireEvent.change(input, { target: { value: "New task" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(screen.getByText("New task")).toBeInTheDocument()
    expect(input).toHaveValue("")
  })

  it("does not add empty todos", () => {
    render(<TodoApp />)
    const input = screen.getByPlaceholderText("Add a todo...")
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.keyDown(input, { key: "Enter" })
    // Should still have only the 3 default todos
    const items = screen.getAllByRole("button", { name: /toggle dark mode/i })
    expect(items).toHaveLength(1) // just the theme toggle
  })

  it("toggles a todo completed state", () => {
    render(<TodoApp />)
    // The first checkbox button toggles the first todo
    const checkboxes = document.querySelectorAll<HTMLButtonElement>(
      ".group button:first-of-type"
    )
    // Click first todo's checkbox
    fireEvent.click(checkboxes[0])
    // "Welcome to your todo list" should now be completed (line-through)
    const todoText = screen.getByText("Welcome to your todo list")
    expect(todoText).toHaveClass("line-through")
  })

  it("deletes a todo", () => {
    render(<TodoApp />)
    // Find delete buttons (they contain Trash2 icons)
    const deleteButtons = document.querySelectorAll<HTMLButtonElement>(
      ".group button:last-of-type"
    )
    fireEvent.click(deleteButtons[0])
    expect(screen.queryByText("Welcome to your todo list")).not.toBeInTheDocument()
  })

  it("persists todos to localStorage", () => {
    render(<TodoApp />)
    const input = screen.getByPlaceholderText("Add a todo...")
    fireEvent.change(input, { target: { value: "Persisted task" } })
    fireEvent.keyDown(input, { key: "Enter" })

    const stored = JSON.parse(localStorage.getItem("notion-todos")!)
    expect(stored).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ text: "Persisted task", completed: false }),
      ])
    )
  })

  it("loads todos from localStorage on mount", () => {
    const saved = [
      { id: "saved-1", text: "Saved todo", completed: false },
    ]
    localStorage.setItem("notion-todos", JSON.stringify(saved))

    render(<TodoApp />)
    expect(screen.getByText("Saved todo")).toBeInTheDocument()
    expect(screen.queryByText("Welcome to your todo list")).not.toBeInTheDocument()
  })

  it("falls back to defaults on corrupt localStorage data", () => {
    localStorage.setItem("notion-todos", "not-json!!!")
    render(<TodoApp />)
    expect(screen.getByText("Welcome to your todo list")).toBeInTheDocument()
  })
})

describe("Dark mode", () => {
  it("toggles dark class on html element", () => {
    render(<TodoApp />)
    const toggleBtn = screen.getByRole("button", { name: /toggle dark mode/i })

    // Default depends on prefers-color-scheme; click to toggle
    const wasDark = document.documentElement.classList.contains("dark")
    fireEvent.click(toggleBtn)
    expect(document.documentElement.classList.contains("dark")).toBe(!wasDark)
  })

  it("persists theme preference to localStorage", () => {
    render(<TodoApp />)
    const toggleBtn = screen.getByRole("button", { name: /toggle dark mode/i })

    fireEvent.click(toggleBtn)
    const stored = localStorage.getItem("notion-todo-theme")
    expect(["dark", "light"]).toContain(stored)
  })

  it("loads theme from localStorage on mount", () => {
    localStorage.setItem("notion-todo-theme", "dark")
    render(<TodoApp />)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })
})

describe("Inline editing", () => {
  it("enters edit mode on click and saves on Enter", () => {
    render(<TodoApp />)
    const todoText = screen.getByText("Welcome to your todo list")
    fireEvent.click(todoText)

    const input = document.querySelector<HTMLInputElement>(
      ".group input[value='Welcome to your todo list']"
    )
    expect(input).toBeInTheDocument()

    fireEvent.change(input!, { target: { value: "Updated text" } })
    fireEvent.keyDown(input!, { key: "Enter" })
    expect(screen.getByText("Updated text")).toBeInTheDocument()
  })

  it("cancels edit on Escape", () => {
    render(<TodoApp />)
    const todoText = screen.getByText("Welcome to your todo list")
    fireEvent.click(todoText)

    const input = document.querySelector<HTMLInputElement>(
      ".group input[value='Welcome to your todo list']"
    )
    fireEvent.change(input!, { target: { value: "Changed" } })
    fireEvent.keyDown(input!, { key: "Escape" })
    expect(screen.getByText("Welcome to your todo list")).toBeInTheDocument()
    expect(screen.queryByText("Changed")).not.toBeInTheDocument()
  })

  it("deletes todo when edited to empty and blurred", () => {
    render(<TodoApp />)
    const todoText = screen.getByText("Welcome to your todo list")
    fireEvent.click(todoText)

    const input = document.querySelector<HTMLInputElement>(
      ".group input[value='Welcome to your todo list']"
    )
    fireEvent.change(input!, { target: { value: "" } })
    fireEvent.blur(input!)
    expect(screen.queryByText("Welcome to your todo list")).not.toBeInTheDocument()
  })
})

describe("Progress bar", () => {
  it("shows correct completion count", () => {
    render(<TodoApp />)
    // Default: 1 completed out of 3
    expect(screen.getByText("1 of 3 tasks done")).toBeInTheDocument()
    expect(screen.getByText("33%")).toBeInTheDocument()
  })

  it("updates when todo is toggled", () => {
    render(<TodoApp />)
    const checkboxes = document.querySelectorAll<HTMLButtonElement>(
      ".group button:first-of-type"
    )
    // Toggle first todo to completed
    fireEvent.click(checkboxes[0])
    expect(screen.getByText("2 of 3 tasks done")).toBeInTheDocument()
    expect(screen.getByText("67%")).toBeInTheDocument()
  })

  it("renders a progressbar element", () => {
    render(<TodoApp />)
    const bar = screen.getByRole("progressbar")
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute("aria-valuenow", "33")
  })
})

describe("Filter tabs", () => {
  it("renders All, Active, and Completed filter buttons", () => {
    render(<TodoApp />)
    expect(screen.getByText("All")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Completed")).toBeInTheDocument()
  })

  it("shows only active todos when Active filter is selected", () => {
    render(<TodoApp />)
    fireEvent.click(screen.getByText("Active"))
    // "Click the checkbox to complete" is completed by default
    expect(screen.queryByText("Click the checkbox to complete")).not.toBeInTheDocument()
    expect(screen.getByText("Welcome to your todo list")).toBeInTheDocument()
    expect(screen.getByText("Click to edit a todo")).toBeInTheDocument()
  })

  it("shows only completed todos when Completed filter is selected", () => {
    render(<TodoApp />)
    fireEvent.click(screen.getByText("Completed"))
    expect(screen.getByText("Click the checkbox to complete")).toBeInTheDocument()
    expect(screen.queryByText("Welcome to your todo list")).not.toBeInTheDocument()
    expect(screen.queryByText("Click to edit a todo")).not.toBeInTheDocument()
  })

  it("shows all todos when All filter is selected after filtering", () => {
    render(<TodoApp />)
    fireEvent.click(screen.getByText("Active"))
    fireEvent.click(screen.getByText("All"))
    expect(screen.getByText("Welcome to your todo list")).toBeInTheDocument()
    expect(screen.getByText("Click the checkbox to complete")).toBeInTheDocument()
  })
})

describe("Clear completed", () => {
  it("shows clear completed button when there are completed todos", () => {
    render(<TodoApp />)
    expect(screen.getByText("Clear completed (1)")).toBeInTheDocument()
  })

  it("removes all completed todos when clicked", () => {
    render(<TodoApp />)
    fireEvent.click(screen.getByText("Clear completed (1)"))
    expect(screen.queryByText("Click the checkbox to complete")).not.toBeInTheDocument()
    expect(screen.getByText("Welcome to your todo list")).toBeInTheDocument()
    expect(screen.getByText("Click to edit a todo")).toBeInTheDocument()
  })

  it("hides clear completed button when no completed todos exist", () => {
    render(<TodoApp />)
    fireEvent.click(screen.getByText("Clear completed (1)"))
    expect(screen.queryByText(/Clear completed/)).not.toBeInTheDocument()
  })
})

describe("Task count", () => {
  it("shows remaining active task count", () => {
    render(<TodoApp />)
    // 2 active tasks out of 3 default
    expect(screen.getByText("2 tasks remaining")).toBeInTheDocument()
  })

  it("uses singular form for 1 task", () => {
    const saved = [
      { id: "1", text: "Only one", completed: false },
    ]
    localStorage.setItem("notion-todos", JSON.stringify(saved))
    render(<TodoApp />)
    expect(screen.getByText("1 task remaining")).toBeInTheDocument()
  })
})

describe("Empty state", () => {
  it("shows empty state message when no todos exist", () => {
    localStorage.setItem("notion-todos", JSON.stringify([]))
    render(<TodoApp />)
    expect(screen.getByText("No tasks yet. Add one below!")).toBeInTheDocument()
  })

  it("shows active empty state when all todos are completed", () => {
    const saved = [{ id: "1", text: "Done", completed: true }]
    localStorage.setItem("notion-todos", JSON.stringify(saved))
    render(<TodoApp />)
    fireEvent.click(screen.getByText("Active"))
    expect(screen.getByText("No active tasks. Great job!")).toBeInTheDocument()
  })

  it("shows completed empty state when no todos are completed", () => {
    const saved = [{ id: "1", text: "Todo", completed: false }]
    localStorage.setItem("notion-todos", JSON.stringify(saved))
    render(<TodoApp />)
    fireEvent.click(screen.getByText("Completed"))
    expect(screen.getByText("No completed tasks yet.")).toBeInTheDocument()
  })
})

describe("Drag and drop", () => {
  it("renders drag handles on todo items", () => {
    render(<TodoApp />)
    // GripVertical icons should be present as drag handles
    const gripIcons = document.querySelectorAll(".cursor-grab")
    expect(gripIcons.length).toBe(3) // one per default todo
  })
})
