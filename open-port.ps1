# Request admin elevation and open port
Start-Process powershell -ArgumentList '-Command', 'netsh advfirewall firewall add rule name=ViteDev3005 dir=in action=allow protocol=tcp localport=3005' -Verb RunAs -Wait
Write-Host "Port 3005 opened!"
