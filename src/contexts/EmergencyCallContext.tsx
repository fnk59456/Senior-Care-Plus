import React, { createContext, useContext, useState, ReactNode } from 'react'

// 緊急呼叫狀態類型
export type EmergencyCallStatus = "none" | "pending" | "responding" | "completed" | "cancelled"

// Context 類型
interface EmergencyCallContextType {
  hasActiveCall: boolean
  callStatus: EmergencyCallStatus
  setCallStatus: (status: EmergencyCallStatus) => void
}

// 創建 Context
const EmergencyCallContext = createContext<EmergencyCallContextType | undefined>(undefined)

// Provider 組件
export function EmergencyCallProvider({ children }: { children: ReactNode }) {
  const [callStatus, setCallStatus] = useState<EmergencyCallStatus>("none")
  
  const hasActiveCall = callStatus === "pending" || callStatus === "responding"

  return (
    <EmergencyCallContext.Provider value={{
      hasActiveCall,
      callStatus,
      setCallStatus
    }}>
      {children}
    </EmergencyCallContext.Provider>
  )
}

// Hook 來使用 Context
export function useEmergencyCall() {
  const context = useContext(EmergencyCallContext)
  if (context === undefined) {
    throw new Error('useEmergencyCall must be used within an EmergencyCallProvider')
  }
  return context
} 