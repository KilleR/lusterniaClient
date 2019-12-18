var buffer = "";
var channel_buffer = "";
var help_buffer = "";
var map_buffer = new Array();
var has_mxp = false;
var skip_next_visible_line = false;
var open_tags = [];
var test_div;
var next_part_prefix = "";

$(document).ready(function () {
    test_div = $("<div/>");
})

var handle_telnet_read = function (data) {
    buffer += data;
    buffer = handle_negotiation(buffer);

    // This is not perfect, as it can split legitimate GMCP payloads if they contain the special chars. But it'll do.
    var idx = buffer.indexOf("\xFF\xF9");   // IAC GA
    if (idx >= 0) {
        var res = buffer.substr(0, idx + 2);
        buffer = buffer.substr(idx + 2);
        if (debug_log_raw === true)
            log_raw(res);
        return res;
    }

    var l = buffer.length;
    // IAC SB / IAC SE (for standalone GMCP replies/notices)
    if (((buffer[0] + buffer[1]) == "\xFF\xFA") && ((buffer[l - 2] + buffer[l - 1]) == "\xFF\xF0")) {
        var res = buffer;
        buffer = "";
        if (debug_log_raw === true)
            log_raw(res);
        return res;
    }
    return false;
}

// split a block into lines, the prompt, and GMCP markers for fixed width, help, etc
var telnet_split = function (msg) {
    if (typeof msg == "undefined" || msg == undefined)
        return false;

    msg = msg.replace(/\r/gm, "");

    // split GMCP chunks
    var gmcp_split = [];
    gmcp_regex = /\xFF\xFA\xC9([^\xFF]+)\xFF\xF0/;
    while (gmcp_matches = gmcp_regex.exec(msg)) {
        var idx = gmcp_matches.index;
        if (idx > 0) {
            var chunk = {};
            chunk.text = msg.substr(0, idx);
            gmcp_split.push(chunk);
        }

        var gmcp_method = gmcp_matches[1].trim();
        var gmcp_args = '';
        var gidx = gmcp_method.indexOf(' ');
        if (gidx >= 0) {
            gmcp_args = gmcp_method.substr(gidx + 1);
            gmcp_method = gmcp_method.substr(0, gidx);
        }
        var gchunk = handle_GMCP({"GMCP": {"method": gmcp_method, "args": gmcp_args}});
        if (gchunk) gmcp_split.push(gchunk);

        msg = msg.substr(idx + gmcp_matches[0].length);
    }
    if (msg.length) {
        var chunk = {};
        chunk.text = msg;
        gmcp_split.push(chunk);
    }

    // split text chunks into lines
    // we know that we have either one full text block including a prompt, or no blocks at all
    var txt = '';
    var lines = [];
    for (var i = 0; i < gmcp_split.length; ++i) {
        if (!gmcp_split[i].text) {
            lines.push(gmcp_split[i]);
            continue;
        }
        txt += gmcp_split[i].text;
        do {
            var idx = txt.indexOf("\n");
            if (idx >= 0) {
                var chunk = {};
                chunk.line = txt.substr(0, idx);
                txt = txt.substr(idx + 1);
                lines.push(chunk);
            }
        } while (idx >= 0);
    }
    var idx = txt.indexOf("\xFF\xF9");   // IAC GA
    if (idx >= 0) {
        var chunk = {};
        chunk.prompt = txt.substr(0, idx);
        txt = txt.substr(idx + 2);
        lines.push(chunk);
    }
    if (txt.length) {
        // This shouldn't happen, as it means that we have a problem with the logic somewhere.
        console.log('Unhandled text bit: "' + txt + '" of size ' + txt.length);
    }
    return lines;
}

var ansi_color_code = function (color, reverted) {
    if ((color < 0) || (color > 15)) return undefined;
    if (reverted && client.custom_colors_reverted[color]) return client.custom_colors_reverted[color];
    if ((!reverted) && client.custom_colors[color]) return client.custom_colors[color];

    if (reverted) {
        if (color == 0) return '#eeeeee';
        if (color == 1) return '#800000';
        if (color == 2) return '#00b300';
        if (color == 3) return '#808000';
        if (color == 4) return '#000070';
        if (color == 5) return '#800080';
        if (color == 6) return '#008080';
        if (color == 7) return '#303030';

        if (color == 8) return '#464646';
        if (color == 9) return '#700000';
        if (color == 10) return '#007000';
        if (color == 11) return '#707000';
        if (color == 12) return '#000070';
        if (color == 13) return '#700070';
        if (color == 14) return '#007070';
        if (color == 15) return '#333333';
    }

    if (color == 0) return '#000000';
    if (color == 1) return '#800000';
    if (color == 2) return '#00b300';
    if (color == 3) return '#808000';
    if (color == 4) return '#0000a0';
    if (color == 5) return '#800080';
    if (color == 6) return '#008080';
    if (color == 7) return '#aaaaaa';

    if (color == 8) return '#464646';
    if (color == 9) return '#ff0000';
    if (color == 10) return '#00ff00';
    if (color == 11) return '#ffff00';
    if (color == 12) return '#0000ff';
    if (color == 13) return '#ff00ff';
    if (color == 14) return '#00ffff';
    if (color == 15) return '#ffffff';

    return undefined;
}

var set_ansi_color_code = function (color, reverted, code) {
    if ((color < 0) || (color > 15)) return;
    if (reverted) client.custom_colors_reverted[color] = code;
    else client.custom_colors[color] = code;
}

// color is from 0 to 15, or 16-255 for the 256-color support
var get_ansi_color = function (color, is_bg) {
    if (is_bg && (color == 0)) return '';
    if (color < 16) return ansi_color_code(color, client.reverted);

    // 256 color, values taken from http://www.mudpedia.org/mediawiki/index.php/Xterm_256_colors
    var c256 = Array('00', '5f', '87', 'af', 'd7', 'ff');
    if ((color > 15) && (color < 232)) {
        color -= 16;
        var b = color % 6;
        color = Math.floor(color / 6);
        var g = color % 6;
        var r = Math.floor(color / 6);
        return '#' + c256[r] + c256[g] + c256[b];
    }
    if ((color >= 232) && (color <= 255)) {
        var g = Math.floor((color - 232) * 255 / 23).toString(16);
        if (g.length == 1) g = '0' + g;
        return '#' + g + g + g;
    }

    return '#aaaaaa';
}

var get_ansi_color_name = function (id) {
    if (id == 0) return 'Black';
    if (id == 1) return 'Dark Red';
    if (id == 2) return 'Dark Green';
    if (id == 3) return 'Dark Yellow';
    if (id == 4) return 'Dark Blue';
    if (id == 5) return 'Dark Magenta';
    if (id == 6) return 'Dark Cyan';
    if (id == 7) return 'Gray';
    if (id == 8) return 'Dark Gray';
    if (id == 9) return 'Bright Red';
    if (id == 10) return 'Bright Green';
    if (id == 11) return 'Bright Yellow';
    if (id == 12) return 'Bright Blue';
    if (id == 13) return 'Bright Magenta';
    if (id == 14) return 'Bright Cyan';
    if (id == 15) return 'White';
    return '';
}


var parse_lines = function (lines) {
    if (lines == null) return false;
    if (lines.length == 0) return false;

    var gagging_channel = false;
    var overhead_map = false, display_help = false, display_window = false;
    var buffer = '';
    var state = {};

    var res = [];

    for (var i = 0; i < lines.length; ++i) {
        if (lines[i].display_fixed_font) {
            GMCP.Display.Monospace = lines[i].start;
            continue;
        }

        // overhead map redirection
        if (lines[i].ohmap && client.map_enabled()) {
            if (lines[i].start) {
                overhead_map = true;
                buffer = '';
            } else {
                overhead_map = false;
                client.mapper.display_overhead_map(buffer);
            }
            continue;
        }
        if (overhead_map) {
            buffer += '<div class="mono">' + parse_and_format_line(lines[i].line) + '</div>';
            continue;
        }

        // redirect helps
        if (lines[i].display_help) {
            if (lines[i].start) {
                display_help = true;
                buffer = '';
            } else {
                display_help = false;
                display_help_window(buffer);
                buffer = '';
            }
            continue;
        }
        // redirect helps
        if (lines[i].display_window) {
            if (lines[i].start) {
                display_window = true;
                buffer = '';
            } else {
                display_help = false;
                display_command_window(buffer, lines[i].cmd);
                buffer = '';
            }
            continue;
        }

        if (display_help || display_window) {
            buffer += '<div class="mono">' + parse_and_format_line(lines[i].line) + '</div>';
            continue;
        }

        // gag channels if requested
        if (lines[i].channel) {
            if (lines[i].start) {
                var ch = lines[i].channel;
                if (should_gag_channel(ch))
                    gagging_channel = true;
            } else
                gagging_channel = false;
            lines[i].gag = true;
            res.push(lines[i]);
            continue;
        }
        if (gagging_channel) lines[i].gag = true;

        if (lines[i].line) {
            lines[i].parsed_line = parse_line(lines[i].line, state);
            if (GMCP.Display.Monospace) lines[i].monospace = true;
        }
        if (lines[i].prompt) lines[i].parsed_prompt = parse_line(lines[i].prompt, state);
        res.push(lines[i]);
    }
    return res;
}

var generate_text_block = function (lines) {
    var count = 0;

    var timestamp;
    if (client.show_timestamp_milliseconds === true)
        timestamp = client.getTimeMS();
    else
        timestamp = client.getTimeNoMS();
    var cl = "timestamp mono no_out";
    timestamp = "<span class=\"" + cl + "\">" + timestamp + "&nbsp;</span>";

    var res = '';

    var counter = 0;
    for (var i = 0; i < lines.length; ++i) {
        var txt = lines[i].parsed_line;
        var font = lines[i].monospace ? 'mono' : '';
        var line = "<div class=\"" + font + "\">" + timestamp + (txt ? txt.formatted() : '') + "</div>";

        // we want gagged lines to be logged, too
        if (logging && txt) append_to_log(line);

        if (lines[i].gag) continue;
        counter++;

        if (txt) {
            count++;
            res += line;
        }
        var pr = lines[i].parsed_prompt;
        if (pr && (count > 0)) {   // no prompt if we gagged everything
            res += "<div class=\"prompt " + font + "\">" + timestamp + pr.formatted() + "</div>";
        }
        // empty line - include it if it's neither the first nor the last one
        // using "counter" instead of "i" fixes problems where the empty line is included after channel markers and such
        if ((!pr) && (!txt) && (counter > 1) && (i < lines.length - 1)) {
            res += '<div line>' + timestamp + '&nbsp;' + '</div>';
        }
    }
    if (client.extra_break && res.length) res += "<br />";
    return res;
}

// Telnet negotiation //
var handle_negotiation = function (data) {
    //console.log(data);
    re = /\xFF[\xFB|\xFC|\xFD|\xFE][\x00-\xFF]/gm;

    while ((matches = re.exec(data)) !== null) {

        ntype = matches[0][1];
        nfeature = matches[0][2];

        if (ntype == TELNET_WILL || ntype == TELNET_DO) {
            if (nfeature == TELNET_GMCP) {
                // Also send what we WILL do //
                send_GMCP("Core.Hello", {
                    "Client": "IRE-ChroMUD",
                    "Version": client.client_version + (client.real_mobile ? 'mobile' : '')
                });
                var supports = [];
                supports = ["Char 1", "Char.Skills 1", "Char.Items 1", "Comm.Channel 1", "IRE.Rift 1", "IRE.FileStore 1", "Room 1", "IRE.Composer 1", "Redirect 1", "IRE.Display 3", "IRE.Tasks 1", "IRE.Sound 1", "IRE.Misc 1", "IRE.Time 1", "IRE.Target 1"];
                send_GMCP("Core.Supports.Set", supports);

                // also send termtype here
                // IAC WILL TTYPE; IAC SB TTYPE IS XTERM-256COLOR IAC SE
                ws_send(TELNET_IAC + TELNET_WILL + TELNET_TTYPE);
                ws_send(TELNET_IAC + TELNET_SB + TELNET_TTYPE + TELNET_IS + "XTERM-256COLOR" + TELNET_IAC + TELNET_SE);

                if (typeof on_connect_mud == "function") {
                    setTimeout(function () {
                        on_connect_mud();
                        on_connect_mud = null;
                    }, 0);
                }
            } else {
                if (ntype == TELNET_WILL)
                    ws_send(TELNET_IAC + TELNET_DONT + nfeature);
                else
                    ws_send(TELNET_IAC + TELNET_WONT + nfeature);
            }
        }
    }

    return data.replace(/\xFF[\xFB|\xFC|\xFD|\xFE][\x00-\xFF]/gm, "");
}

var log_raw = function (buffer) {

    buffer = buffer.replace(/\r\n/gm, "\\r\\n\r\n");
    /*buffer = buffer.replace(/\r/gm, "\\r\r");
    buffer = buffer.replace(/\n/gm, "\\n\n");*/

    buffer = buffer.replace(/([\x00-\x08\x0E-\x1F\x80-\xFF])/gm, function (match, $1, offset, original) {
        return $1.charCodeAt(0) + " ";
    });

    console.log(buffer);
}

// Telnet codes //
var TELNET_IS = String.fromCharCode(0);         // \x00
var TELNET_SEND = String.fromCharCode(1);       // \x01
var TELNET_ECHO = String.fromCharCode(1);       // \x01
var TELNET_ETX = String.fromCharCode(3);        // \x03
var TELNET_EOT = String.fromCharCode(4);        // \x04
var TELNET_TTYPE = String.fromCharCode(24);     // \x18
var TELNET_EOR1 = String.fromCharCode(25);      // \x19
var TELNET_MSDP = String.fromCharCode(69);      // \x45
var TELNET_MSSP = String.fromCharCode(70);      // \x46
var TELNET_MCCP2 = String.fromCharCode(86);	// \x56
var TELNET_MCCP = String.fromCharCode(90);      // \x5A
var TELNET_MXP = String.fromCharCode(91);       // \x5B
var TELNET_ZMP = String.fromCharCode(93);       // \x5D

var TELNET_EOR = String.fromCharCode(239);      // \xEF
var TELNET_SE = String.fromCharCode(240);       // \xF0
var TELNET_GA = String.fromCharCode(249);	// \xF9
var TELNET_SB = String.fromCharCode(250);       // \xFA

var TELNET_WILL = String.fromCharCode(251);     // \xFB
var TELNET_WONT = String.fromCharCode(252);     // \xFC
var TELNET_DO = String.fromCharCode(253);       // \xFD
var TELNET_DONT = String.fromCharCode(254);     // \xFE
var TELNET_IAC = String.fromCharCode(255);      // \xFF

var TELNET_ATCP = String.fromCharCode(200);	// \xC8
var TELNET_GMCP = String.fromCharCode(201);     // \xC9

var TELNET_ESC = String.fromCharCode(27);       // \x1B


