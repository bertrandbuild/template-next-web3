"use client"

import { useEffect, useState } from "react"
import * as Progress from "@radix-ui/react-progress"
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from "chart.js"
// @ts-expect-error graphql-request is having trouble with TS but it works
import { gql, request } from "graphql-request"
import { Line } from "react-chartjs-2"

import { Loader } from "@/components/loader"
import { AuthMenu } from "@/components/navbar"
import { useWeb3Auth } from "@/components/web3auth/web3auth-context"

interface Message {
  db_write_timestamp: string
  id: string
  chatId: string
  content: string
  role: "user" | "assistant"
}

// Recording Chart.js elements
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function AdminPage() {
  const { isLoggedIn, isAdmin } = useWeb3Auth()
  const [data, setData] = useState<any>(null)
  const [dailyRequests, setDailyRequests] = useState<any>({})
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const MESSAGES_QUERY = gql`
    query GetMessages {
      Chatsearchai_MessageAdded(order_by: { db_write_timestamp: asc }) {
        id
        chatId
        db_write_timestamp
        content
        role
      }
    }
  `

  async function fetchMessages() {
    setIsLoading(true)
    setError(null)
    try {
      const result = await request(
        "https://indexer.bigdevenergy.link/b19e0f3/v1/graphql",
        MESSAGES_QUERY
      )
      console.log("result", result)
      setData(result)

      // Count daily requests
      const dailyReqs = result.Chatsearchai_MessageAdded.reduce(
        (acc: any, message: any) => {
          const date = new Date(message.db_write_timestamp)
            .toISOString()
            .split("T")[0]
          if (message.role === "user") {
            acc[date] = acc[date] ? acc[date] + 1 : 1
          }
          return acc
        },
        {}
      )
      setDailyRequests(dailyReqs)
    } catch (err) {
      setError("Failed to fetch messages")
      console.error("Error fetching messages:", err)
    } finally {
      setIsLoading(false)
    }
  }

  function generateRandomChatId() {
    return Math.floor(Math.random() * 100) // Create ID random
  }

  function generateRandomTimestamp() {
    const start = new Date(2024, 8, 1) // 1er september 2024
    const end = new Date(2024, 8, 30) // 30 september 2024
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    ).toISOString()
  }

  function generateRandomContent(role: string) {
    const userQuestions = [
      "What is iExec?",
      "How does blockchain work?",
      "Tell me more about decentralized finance.",
      "What is galadirel?",
      "Your Foolish IA",
      "What is the future of AI?",
      "Can you explain smart contracts?",
      "What's the difference between Ethereum and Bitcoin?",
    ]

    const assistantAnswers = [
      "iExec is a decentralized platform designed to facilitate the development and trading of cloud computing services.",
      "Blockchain is a distributed ledger technology.",
      "Decentralized finance refers to financial systems built on blockchain networks.",
      "Galadirel is a fictional place from literature.",
      "No",
      "Yes",
      "AI is the future of technology.",
      "Smart contracts are self-executing contracts with the terms of the agreement directly written into code.",
    ]

    return role === "user"
      ? userQuestions[Math.floor(Math.random() * userQuestions.length)]
      : assistantAnswers[Math.floor(Math.random() * assistantAnswers.length)]
  }

  function generateMockData(numEntries: number) {
    const mockData = {
      data: {
        Chatsearchai_MessageAdded: [] as Message[],
      },
    }

    for (let i = 0; i < numEntries; i++) {
      const chatId = generateRandomChatId()
      const timestamp = generateRandomTimestamp()
      const role = i % 2 === 0 ? "user" : "assistant" // user and assistant
      const content = generateRandomContent(role)

      mockData.data.Chatsearchai_MessageAdded.push({
        id: `696969_${chatId}_${i}`,
        chatId: `${chatId}`,
        db_write_timestamp: timestamp,
        content,
        role,
      })
    }

    return mockData
  }

  const fetchMockData = async () => {
    const mockData = generateMockData(100)
    setData(mockData.data)

    // Count daily requests
    const dailyReqs = mockData.data.Chatsearchai_MessageAdded.reduce(
      (acc: any, message: any) => {
        const date = new Date(message.db_write_timestamp)
          .toISOString()
          .split("T")[0]
        if (message.role === "user") {
          acc[date] = acc[date] ? acc[date] + 1 : 1
        }
        return acc
      },
      {}
    )

    setDailyRequests(dailyReqs)
  }

  // Data simulation while waiting for the API
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_IS_DEV === "trueeeee") {
      console.log("Fetching mock data")
      fetchMockData()
    } else {
      console.log("Fetching real data")
      fetchMessages()
    }
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-screen">
        <h2>
          <Loader />
        </h2>
      </div>
    )
  }

  if (!isLoggedIn && !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-center mb-4">
          Please log in to your <strong>administrator</strong> account
        </h1>
        <div className="flex items-center justify-center">
          <AuthMenu />
        </div>
      </div>
    )
  }

  if (error) {
    return <div>{error}</div>
  }

  // Calculate the number of messages and their distribution
  const totalMessages = data.Chatsearchai_MessageAdded.length
  const userMessages = data.Chatsearchai_MessageAdded.filter(
    (msg: any) => msg.role === "user"
  ).length
  const assistantMessages = data.Chatsearchai_MessageAdded.filter(
    (msg: any) => msg.role === "assistant"
  ).length
 
  // Check for valid messages (wizard says ‘No’) and spam (wizard says ‘Yes’)
  const spamMessages = data.Chatsearchai_MessageAdded.filter(
    (msg: any) =>
      msg.role === "assistant" && msg.content.toLowerCase() === "yes"
  ).length
  const validMessages = totalMessages - spamMessages

  // Check for fail-safe responses (responses without an ‘Error’ or failure message)
  const successfulResponses = data.Chatsearchai_MessageAdded.filter(
    (msg: any) =>
      msg.role === "assistant" && !msg.content.toLowerCase().includes("error")
  ).length

  // Calculate the reliability percentage
  const reliabilityRate = (successfulResponses / userMessages) * 100

  // Group messages by chatId
  const groupedMessages = data.Chatsearchai_MessageAdded.reduce(
    (acc: any, message: any) => {
      if (!acc[message.chatId]) {
        acc[message.chatId] = []
      }
      acc[message.chatId].push(message)
      return acc
    },
    {}
  )

  // Preparing the data for the graph
  const labels = Object.keys(dailyRequests).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  ) // Unique day
  const requestsData = labels.map((date) => dailyRequests[date]) // Dayli requests

  const chartData = {
    labels,
    datasets: [
      {
        label: "Daily requests",
        data: requestsData,
        borderColor: "rgba(75, 192, 192, 1)",
        backgroundColor: "rgba(75, 192, 192, 0.2)",
        fill: true,
        tension: 0.4, // To smooth lines
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Nombre de requêtes journalières",
      },
    },
    scales: {
      y: {
        beginAtZero: true, // Commence à 0
        ticks: {
          stepSize: 1, // Utilisation d'un pas de 1
        },
      },
    },
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
      <div className="text-center text-lg font-medium text-gray-700 dark:text-gray-300">
        powered by <span className="font-bold"><a href="https://envio.dev/app/bertrandbuild/teckdoc-3" target="_blank" rel="noopener noreferrer">Envio</a></span>
      </div>

      {/* General statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <div className="p-4 bg-gray-300 dark:bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Total Messages</h2>
          <p>{totalMessages}</p>
        </div>

        <div className="p-4 bg-gray-300 dark:bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">User Requests</h2>
          <p>{userMessages}</p>
        </div>

        <div className="p-4 bg-gray-300 dark:bg-gray-700 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Assistant Responses</h2>
          <p>{assistantMessages}</p>
        </div>
      </div>

      {/* Valid and spam message counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        <div className="p-4 bg-green-100 dark:bg-green-700 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Valid Messages</h2>
          <p>{validMessages}</p>
        </div>

        <div className="p-4 bg-red-100 dark:bg-red-700 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Spam Messages</h2>
          <p>{spamMessages}</p>
        </div>
      </div>

      {/* Comparison of response reliability with progress bar */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Response Reliability</h2>
        <div className="p-4 rounded-lg shadow-md bg-gray-300 dark:bg-gray-700">
          <h3 className="text-lg font-semibold">Reliability Rate</h3>
          <p>
            {successfulResponses} successful responses out of {userMessages}{" "}
            requests
          </p>
          <Progress.Root className="h-4 bg-gray-200 rounded-full overflow-hidden">
            <Progress.Indicator
              className="bg-green-500 h-full"
              style={{ width: `${reliabilityRate}%` }}
            />
          </Progress.Root>
          <p className="mt-2 text-sm text-green-800 dark:text-green-400">
            Reliability Rate: {reliabilityRate.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Graph of daily requests */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Daily requests</h2>
        <div className="p-4 bg-white rounded-lg shadow-md">
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* All Message */}
      <div className="h-96 overflow-y-auto p-4 bg-gray-300 dark:bg-gray-700 rounded-lg shadow-md">
        {Object.keys(groupedMessages).map((chatId) => (
          <div key={chatId} className="mb-6">
            <h2 className="text-xl font-bold mb-4">Chat ID: {chatId}</h2>
            <div className="space-y-4">
              {groupedMessages[chatId].map((message: any) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg shadow-md ${
                    message.role === "user"
                      ? "bg-blue-100 dark:bg-blue-500"
                      : "bg-gray-100 dark:bg-gray-500"
                  }`}
                >
                  <h3 className="text-lg font-semibold">
                    {message.role === "user" ? "User" : "Assistant"}
                  </h3>
                  <p>{message.content}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
