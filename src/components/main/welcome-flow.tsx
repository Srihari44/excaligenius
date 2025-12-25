"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface WelcomeFlowProps {
  onProjectSetup: (description: string) => void
}

export default function WelcomeFlow({ onProjectSetup }: WelcomeFlowProps) {
  const [step, setStep] = useState<"welcome" | "describe">("welcome")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const handleStartProject = () => {
    setStep("describe")
  }

  const handleProjectDescribe = async () => {
    if (!description.trim()) return

    setLoading(true)
    onProjectSetup(description)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      {step === "welcome" ? (
        <Card className="w-full max-w-2xl shadow-2xl border-blue-500/20 bg-slate-800/80 backdrop-blur">
          <CardHeader className="space-y-4 text-center">
            <CardTitle className="text-4xl text-white font-bold">Welcome to ExcaliDraw AI</CardTitle>
            <CardDescription className="text-lg text-slate-300">
              Collaborate with AI to design, review, and refine your diagrams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-slate-300">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-white">Describe Your Vision</h3>
                  <p className="text-sm text-slate-400">Tell us what you want to build or design</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-white">Create in Excalidraw</h3>
                  <p className="text-sm text-slate-400">Draw and design your diagram freely</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-white">Get AI Feedback</h3>
                  <p className="text-sm text-slate-400">Evaluate with Gemini and iterate together</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartProject}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12"
            >
              Start Creating
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-2xl shadow-2xl border-blue-500/20 bg-slate-800/80 backdrop-blur">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl text-white font-bold">What would you like to build?</CardTitle>
            <CardDescription className="text-slate-300">
              Describe your diagram, design, or architecture. Be as detailed as you'd like.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="e.g., I want to create a user authentication flow with OAuth and JWT tokens. Show the interaction between the client, server, and identity provider..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-32 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                disabled={loading}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("welcome")} className="flex-1" disabled={loading}>
                Back
              </Button>
              <Button
                onClick={handleProjectDescribe}
                disabled={loading || !description.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? "Setting up..." : "Continue to Canvas"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
