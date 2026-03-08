# Скрипт для открытия портов с правами администратора
param(
    [int]$Port = 3005,
    [string]$Name = "ViteDev"
)

$RuleName = "$Name$Port"

# Проверяем, есть ли правило
$existing = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue

if ($existing) {
    Write-Host "Правило $RuleName уже существует"
} else {
    # Создаем новое правило
    New-NetFirewallRule -DisplayName $RuleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow -Profile Any
    Write-Host "Порт $Port открыт!"
}

# Также открываем порт Ollama (11434)
$ollamaRule = "Ollama11434"
if (-not (Get-NetFirewallRule -DisplayName $ollamaRule -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ollamaRule -Direction Inbound -Protocol TCP -LocalPort 11434 -Action Allow -Profile Any
    Write-Host "Порт Ollama (11434) открыт!"
}

Write-Host "Готово!"
