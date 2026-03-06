# Add firewall rule for Vite
$ruleName = "ViteDevServer3003"
$port = 3003

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "Rule already exists"
} else {
    # Create new rule
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow -Profile Any
    Write-Host "Rule created for port $port"
}
