"use client"

import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export function ToastTest() {
  const { toast } = useToast()

  return (
    <div className="flex flex-col space-y-2">
      <h2 className="text-xl font-bold">Toast Notifications Test</h2>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => {
            toast({
              title: "Default Toast",
              description: "This is a default toast notification",
            })
          }}
        >
          Default Toast
        </Button>
        
        <Button
          variant="destructive"
          onClick={() => {
            toast({
              title: "Error Toast",
              description: "This is an error toast notification",
              variant: "destructive",
            })
          }}
        >
          Error Toast
        </Button>
        
        <Button
          className="bg-green-500 hover:bg-green-600"
          onClick={() => {
            toast({
              title: "Success Toast",
              description: "This is a success toast notification",
              variant: "success",
            })
          }}
        >
          Success Toast
        </Button>
        
        <Button
          className="bg-yellow-500 hover:bg-yellow-600"
          onClick={() => {
            toast({
              title: "Warning Toast",
              description: "This is a warning toast notification",
              variant: "warning",
            })
          }}
        >
          Warning Toast
        </Button>
        
        <Button
          className="bg-blue-500 hover:bg-blue-600"
          onClick={() => {
            toast({
              title: "Info Toast",
              description: "This is an info toast notification",
              variant: "info",
            })
          }}
        >
          Info Toast
        </Button>
      </div>
    </div>
  )
} 