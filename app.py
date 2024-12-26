from flask import Flask, render_template, send_from_directory, request, jsonify, send_file
import logging
import os
import tempfile
from weasyprint import HTML, CSS
from datetime import datetime

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = "gymnastics_scheduler_secret_key"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/ads.txt')
def ads_txt():
    return send_from_directory('static', 'ads.txt')

@app.route('/download-pdf', methods=['POST'])
def download_pdf():
    try:
        logger.debug("Starting PDF generation process")
        data = request.json
        orientation = data.get('orientation', 'portrait')
        logger.debug(f"Generating PDF in {orientation} orientation")

        # Create HTML content for the PDF
        html_content = '''
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                @page {
                    size: ''' + orientation + ''';
                    margin: 1cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    font-size: 12px;
                }
                .schedule-header {
                    text-align: center;
                    margin-bottom: 30px;
                }
                .schedule-header-image {
                    max-width: 200px;
                    max-height: 100px;
                    width: auto;
                    height: auto;
                    object-fit: contain;
                    margin: 0 auto 15px;
                    display: block;
                }
                .schedule-header-text {
                    font-size: 24px;
                    margin: 15px 0;
                    text-align: center;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                    table-layout: fixed;
                }
                th, td {
                    border: 1px solid #ddd;
                    padding: 8px;
                    text-align: left;
                    height: 40px;
                    font-size: 10px;
                    vertical-align: top;
                }
                th {
                    background-color: #3498db;
                    color: white;
                    font-weight: bold;
                    text-align: center;
                }
                td:first-child {
                    background-color: #2980b9;
                    color: white;
                    width: 80px;
                    text-align: right;
                    padding-right: 8px;
                }
                td.session-cell {
                    background-color: #3498db;
                    color: white;
                    padding: 4px;
                    font-size: 10px;
                    line-height: 1.2;
                    position: relative;
                    z-index: 2;
                }
            </style>
        </head>
        <body>
        '''

        if data.get('headerText') or data.get('headerImageUrl'):
            logger.debug("Adding header to PDF")
            html_content += '<div class="schedule-header">'
            if data.get('headerImageUrl'):
                html_content += f'<img src="{data["headerImageUrl"]}" class="schedule-header-image" alt="Schedule Header">'
            if data.get('headerText'):
                html_content += f'<h1 class="schedule-header-text">{data["headerText"]}</h1>'
            html_content += '</div>'

        html_content += '<table>'
        html_content += '<tr><th>Time</th>'
        for event in data['events']:
            html_content += f'<th>{event["name"]}</th>'
        html_content += '</tr>'

        start_time = datetime.strptime(data['startTime'], '%H:%M')
        end_time = datetime.strptime(data['endTime'], '%H:%M')
        interval = int(data['interval'])

        current_minutes = start_time.hour * 60 + start_time.minute
        end_minutes = end_time.hour * 60 + end_time.minute

        logger.debug(f"Time range: {current_minutes} to {end_minutes} minutes, interval: {interval}")

        occupied_cells = {event['id']: {} for event in data['events']}

        time_minutes = current_minutes
        while time_minutes < end_minutes:
            for event in data['events']:
                session = next(
                    (s for s in data['sessions']
                     if s['eventId'] == event['id'] and
                     s['startTime'] == time_minutes),
                    None
                )
                if session:
                    logger.debug(f"Found session at {time_minutes} for event {event['id']}")
                    duration_slots = session['duration'] // interval
                    for i in range(duration_slots):
                        occupied_cells[event['id']][time_minutes + (i * interval)] = session

            time_minutes += interval

        time_minutes = current_minutes
        while time_minutes < end_minutes:
            current_time = datetime.strptime(f"{time_minutes//60:02d}:{time_minutes%60:02d}", '%H:%M')
            html_content += f'<tr><td>{current_time.strftime("%I:%M %p")}</td>'

            for event in data['events']:
                if time_minutes in occupied_cells[event['id']]:
                    session = occupied_cells[event['id']][time_minutes]
                    if session['startTime'] == time_minutes:
                        logger.debug(f"Creating cell for session at {time_minutes}")
                        group = next(g for g in data['groups'] if g['id'] == session['groupId'])
                        color_index = data['groups'].index(group) % len(['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'])
                        color = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'][color_index]
                        duration_slots = session['duration'] // interval

                        end_time = datetime.strptime(
                            f"{(time_minutes + session['duration'])//60:02d}:{(time_minutes + session['duration'])%60:02d}",
                            '%H:%M'
                        )
                        html_content += f'''
                            <td class="session-cell" rowspan="{duration_slots}" style="background-color: {color}">
                                {group["name"]}<br>
                                {current_time.strftime("%I:%M %p")} - {end_time.strftime("%I:%M %p")}
                            </td>
                        '''
                        continue
                html_content += '<td></td>'

            html_content += '</tr>'
            time_minutes += interval

        html_content += '</table></body></html>'

        logger.debug("Generating PDF from HTML")
        pdf = HTML(string=html_content).write_pdf()

        logger.debug("Creating temporary file for PDF")
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(pdf)

        logger.debug("Sending PDF file")
        return send_file(
            tmp.name,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'schedule_{datetime.now().strftime("%Y%m%d")}.pdf'
        )

    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to generate PDF'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)