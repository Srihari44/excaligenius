import { useState } from "react"
import WelcomeFlow from "@/components/main/welcome-flow"
import Editor from "@/components/main/editor"

interface AppContainerProps {
  apiKey: string
  onLogout: () => void
}

export default function AppContainer({ apiKey, onLogout }: AppContainerProps) {
  const [projectSetup, setProjectSetup] = useState<string | null>(null)

  if (projectSetup) {
    return <Editor projectDescription={projectSetup} apiKey={apiKey} onLogout={onLogout} />
  }

  return <WelcomeFlow onProjectSetup={setProjectSetup} />
}
