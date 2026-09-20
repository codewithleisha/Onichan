package com.oniontwin.farmerapp.data.remote

import com.google.gson.Gson
import com.google.gson.JsonObject
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import okhttp3.*
import java.util.concurrent.TimeUnit

class StorageWebSocketManager {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private val gson = Gson()

    private val _telemetryState = MutableStateFlow(LiveTelemetry())
    val telemetryState: StateFlow<LiveTelemetry> = _telemetryState

    private val _isConnected = MutableStateFlow(false)
    val isConnected: StateFlow<Boolean> = _isConnected

    fun connect(ipAddress: String, port: Int = 8080) {
        val request = Request.Builder()
            .url("ws://$ipAddress:$port")
            .build()

        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                _isConnected.value = true
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    val json = gson.fromJson(text, JsonObject::class.java)
                    if (json.get("type")?.asString == "TELEMETRY_UPDATE") {
                        val payload = json.getAsJsonObject("payload")
                        val telemetry = gson.fromJson(payload, LiveTelemetry::class.java)
                        _telemetryState.value = telemetry
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                _isConnected.value = false
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                _isConnected.value = false
            }
        })
    }

    fun setMode(mode: String) {
        val json = """{"type":"COMMAND_SET_MODE","payload":{"mode":"$mode"}}"""
        webSocket?.send(json)
    }

    fun setStage(stage: String) {
        val json = """{"type":"COMMAND_SET_STAGE","payload":{"stage":"$stage"}}"""
        webSocket?.send(json)
    }

    fun adjustEnvironment(temp: Double?, rh: Double?, fanSpeed: Int?) {
        val payload = JsonObject().apply {
            temp?.let { addProperty("temperature", it) }
            rh?.let { addProperty("relativeHumidity", it) }
            fanSpeed?.let { addProperty("fanSpeed", it) }
        }
        val root = JsonObject().apply {
            addProperty("type", "COMMAND_MANUAL_ADJUST")
            add("payload", payload)
        }
        webSocket?.send(root.toString())
    }

    fun triggerScenario(scenarioName: String) {
        val json = """{"type":"COMMAND_TRIGGER_SCENARIO","payload":{"scenario":"$scenarioName"}}"""
        webSocket?.send(json)
    }

    fun disconnect() {
        webSocket?.close(1000, "User disconnected")
        _isConnected.value = false
    }
}