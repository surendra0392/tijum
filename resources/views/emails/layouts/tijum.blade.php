<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $subject ?? 'TIJUM Notification' }}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #FFF4EE;
            font-family: 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #442F41;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 32px 16px;
        }
        .header {
            text-align: center;
            padding-bottom: 24px;
        }
        .logo-text {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.5px;
            color: #442F41;
            text-decoration: none;
            line-height: 1.1;
        }
        .logo-accent {
            color: #FF7A67;
        }
        .badge {
            display: inline-block;
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background-color: #FFF0EB;
            color: #442F41;
            padding: 4px 14px;
            border-radius: 9999px;
            margin-top: 6px;
            border: 1px solid #FFB6A3;
        }
        .card {
            background-color: #FFFFFF;
            border-radius: 16px;
            border: 1px solid #E6E0DB;
            padding: 32px;
            box-shadow: 0 4px 14px rgba(68, 47, 65, 0.05);
        }
        .title {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            font-size: 20px;
            font-weight: 700;
            color: #442F41;
            margin-top: 0;
            margin-bottom: 16px;
            line-height: 1.35;
        }
        .content {
            font-size: 15px;
            line-height: 1.65;
            color: #554452;
            margin-bottom: 24px;
        }
        .details-box {
            background-color: #FAF7F5;
            border-left: 4px solid #FF7A67;
            padding: 16px 20px;
            border-radius: 0 12px 12px 0;
            margin: 20px 0;
            font-size: 14px;
        }
        .details-box table {
            width: 100%;
            border-collapse: collapse;
        }
        .details-box td {
            padding: 5px 0;
            vertical-align: top;
        }
        .details-label {
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #8B6B82;
            width: 42%;
            font-weight: 600;
            font-size: 13px;
        }
        .details-value {
            color: #442F41;
            font-weight: 700;
            text-align: right;
            font-size: 14px;
        }
        .btn-wrapper {
            text-align: center;
            margin: 28px 0 12px 0;
        }
        .btn {
            display: inline-block;
            background-color: #FF7A67;
            color: #FFFFFF !important;
            font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif;
            font-weight: 700;
            font-size: 15px;
            padding: 12px 30px;
            border-radius: 9999px;
            text-decoration: none;
            letter-spacing: 0.3px;
            box-shadow: 0 4px 10px rgba(255, 122, 103, 0.25);
        }
        .footer {
            text-align: center;
            padding-top: 24px;
            font-size: 12px;
            line-height: 1.6;
            color: #8B6B82;
        }
        .footer a {
            color: #FF7A67;
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <span class="logo-text">Tiju<span class="logo-accent">m</span></span>
            <div>
                <span class="badge">Stay easy. Eat well. Spend less.</span>
            </div>
        </div>

        <div class="card">
            @yield('content')
        </div>

        <div class="footer">
            <p>
                <strong>TIJUM Marketplace Private Limited</strong><br>
                Level 4, Cyber Gateway, HITEC City, Hyderabad, Telangana 500081, India
            </p>
            <p>
                Grievance Redressal Cell: <a href="mailto:grievance@tijum.com">grievance@tijum.com</a> |
                Support: <a href="mailto:support@tijum.com">support@tijum.com</a>
            </p>
            @if(!empty($unsubscribeUrl))
                <p style="margin-top: 8px;">
                    <a href="{{ $unsubscribeUrl }}" style="color: #8B6B82; text-decoration: underline; font-size: 11px;">
                        Manage Notification Preferences / Unsubscribe
                    </a>
                </p>
            @endif
            <p style="color: #A38C9C; font-size: 11px;">
                This is an automated notification regarding your verified booking, account activity, or operations on TIJUM.
            </p>
        </div>
    </div>
</body>
</html>
