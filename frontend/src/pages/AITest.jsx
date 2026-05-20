import { useState, useEffect } from "react"
import { Products } from "../sync/db"

import {
  createAdaptiveMatcher
} from "../voice-ai/adaptiveMatcher"

export default function AITest() {

  const [products, setProducts] = useState([])
  const [matcher, setMatcher] = useState(null)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])

  useEffect(() => {

    Products.list().then((res) => {

      const productList =
        Array.isArray(res)
          ? res
          : (res?.data || [])

      setProducts(productList)

      const m =
        createAdaptiveMatcher(productList)

      setMatcher(m)
    })

  }, [])

  function handleSearch(e) {

    const val = e.target.value

    setQuery(val)

    if (!matcher || !val.trim()) {
      setResults([])
      return
    }

    const matches =
      matcher.findMatches(val)

    setResults(matches || [])
  }

  return (
    <div className="p-6">

      <h1 className="text-2xl font-bold mb-4">
        AI Product Matcher Test
      </h1>

      <input
        value={query}
        onChange={handleSearch}
        placeholder="Try: magi, ammool, kok..."
        className="border p-3 rounded w-full"
      />

      <div className="mt-6 space-y-3">

        {results.map((r, i) => (

          <div
            key={i}
            className="border rounded p-3"
          >
            <div className="font-semibold">
              {r.product?.name}
            </div>

            <div className="text-sm text-gray-500">
              Score:
              {" "}
              {r.score}
            </div>
          </div>

        ))}

      </div>

    </div>
  )
}