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
