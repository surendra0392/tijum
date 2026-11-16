@extends('emails.layouts.tijum')

@section('content')
    <h2 class="title">{{ $title }}</h2>

    <div class="content">
        {!! nl2br(e($body)) !!}
    </div>

    @if (!empty($details))
        <div class="details-box">
            <table>
                @foreach ($details as $label => $val)
                    <tr>
                        <td class="details-label">{{ $label }}</td>
                        <td class="details-value">{{ $val }}</td>
                    </tr>
                @endforeach
            </table>
        </div>
    @endif

    @if (!empty($actionUrl) && !empty($actionText))
        <div class="btn-wrapper">
            <a href="{{ $actionUrl }}" class="btn">{{ $actionText }}</a>
        </div>
    @endif
@endsection
