Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' 1. Khởi động Server Backend ngầm (Ẩn hoàn toàn bảng đen CMD)
WshShell.Run "cmd /c ""cd /d D:\DUZKVIDEOTOOL\web-studio\server && set PATH=D:\node;%PATH% && node index.js""", 0, False

' 2. Đợi 1.5 giây để Server sẵn sàng
WScript.Sleep 1500

' 3. Mở cửa sổ Desktop App độc lập chuyên nghiệp (Không hiện thanh địa chỉ web)
chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

If fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """ --app=http://localhost:5000", 1, False
ElseIf fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=http://localhost:5000", 1, False
Else
    WshShell.Run "http://localhost:5000", 1, False
End If
