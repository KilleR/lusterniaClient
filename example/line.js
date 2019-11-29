
// line chunks

function linechunk_base() {
    var chunk = {};
    chunk.type = function() { return 'base'; }
    chunk.length = function() { return 0; }
    chunk.text = function() { return ''; }
    chunk.formatted = function(chunks) { return ''; }
    chunk.resize = function(start, len) { }
    chunk.update_state = function(state) { return state; }

    return chunk;
}

function linechunk_text(text) {
    var chunk = linechunk_base();
    chunk._txt = text;
    chunk.type = function() { return 'text'; }
    chunk.length = function() { return this._txt ? this._txt.length : 0; }
    chunk.text = function() { return this._txt; }
    var re1 = /\</g; var re2 = /\>/g; var re3 = /&/g;
    var urlRe = /((https?|ftp|file):\/\/[-A-Z0-9+&@#\*\'\(\)\/%?=~_|!:,.;]*[-A-Z0-9+&@#\*\'\(\)\/%=~_|])/igm;
    var helpRe = /\bHELP\b ((?:[A-Z\s]+|\d+(?:\.\d+)?)+)/g;
    chunk.formatted = function(chunks) {
        var res = this._txt;
        // Remove rogue non-printables
        res = res.replace(/[\x00-\x08\x0E-\x1F\x80-\xFF]/gm, "");
        // escape HTML chars
        res = res/*.replace(re3, "&amp;")*/.replace(re1, "&lt;").replace(re2, "&gt;");
        // doing this here means that links with a color change in the middle won't get expanded, which is fine
        // links / help
        res = res.replace(urlRe, function (match, $1, $2, offset, original) {
            return "<a href='" + $1.replace(/\'/g, "%27") + "' class='url_link' target='_blank'>" + $1 + "</a>";
        });

        res = res.replace(helpRe, function (match, $1) {return "<a class=\"mxp_send\" href=\"HELP " + $1 + "\">HELP " + $1 +"</a>"})

        return res;
    }
    chunk.resize = function(start, len) { this._txt = this._txt.substr(start, len); }
    return chunk;
}

// fg and bg are HTML colors, bg can (and usually will) be null
// fg can be 'reset', which resets the colors back to default
function linechunk_color(fg, bg) {
    var chunk = linechunk_base();
    chunk._fg = fg;
    chunk._bg = bg;

    chunk.type = function() { return 'color'; }
    chunk.formatted = function(chunks) {
        if (this._fg === 'reset') {
            var res = chunks.suffix;
            chunks.suffix = '';
            return res;
        }

        var style = '';
        if (this._fg != null) style += 'color: ' + this._fg + '; ';
        if (this._bg != null) style += 'background-color: ' + this._bg + ' ';
        if (style == '') return '';
        var res = '';
        // close previous color tags
        // IMPORTANT: if we use span suffix tags for anything else, this will fail!
        // Disabling this, it's causing weird problems
//        while (chunks.suffix.substr(0, 7) === '</span>') {
//            res += '</span>';
//            chunks.suffix = chunks.suffix.substr(7);
//        }
        chunks.suffix += '</span>';
        return res + '<span style="' + style + '">';
    }
    chunk.update_state = function(state) {
        state.fg = this._fg;
        if (this._fg == 'reset')
            delete state.bg;
        else
            state.bg = this._bg;
        return state;
    }
    return chunk;
}

function linechunk_mxp_send(color, commands, text, hint, isprompt) {
    if (client.reverted) {
        if (color == '#FFFFFF') color = '#000000';
        if (color == '#C0C0C0') color = '#333333';
    }

    var chunk = linechunk_text(text, false);
    chunk._color = color;
    chunk._commands = commands;
    chunk._hint = hint;
    chunk._prompt = isprompt;
    chunk.type = function() { return 'link'; }
    chunk.formatted = function(chunks) {
        var res = '<a class="mxp_send' + (this._prompt ? ' mxp_prompt' : '') + '"';
        res += ' href="' + this._commands + '"';
        if (this._hint) res += ' title="' + this._hint + '"';
        if (this._color) res += ' style="color: ' + this._color + '"';
        res += '>' + this._txt + '</a>';
        return res;
    }
    return chunk;
}

function linechunks_create(chunks) {
    var res = {};
    res.chunks = chunks;

    // helper function for colorize / replace. Ensures that there exists no chunk that spans this position.
    // Chunks starting -at- this position are fine. Chunks -ending- at this position are not (last letter will be split off).
    res.split_chunk_at_pos = function(pos)
    {
        if (pos <= 0) return;  // nothing to do

        var at = 0;
        for (var idx = 0; idx < this.chunks.length; ++idx) {
            // if we got exactly to the desired position, there is no need to split anything; bail out
            if (at == pos) break;
            var len = this.chunks[idx].length();
            if (at + len <= pos) {
                at += len;
                continue;
            }

            // If we got here, at < pos and at + len > pos, meaning we need to split
            var splitlen = pos - at;
            var chunk2 = $.extend(true, {}, this.chunks[idx]);   // create a deep copy of the chunk
            this.chunks[idx].resize(0, splitlen);
            chunk2.resize(splitlen, len);
            this.chunks.splice(idx + 1, 0, chunk2);   // insert chunk2 after the current chunk
            break;
        }
    }


    res.colorize = function(start, end, color, bgcolor) {
        if ((this.chunks == null) || (this.chunks.length == 0))
            return;
        if (end < start) end = start;
        // ensure that no chunk spans the thresholds (simplifies the logic)
        this.split_chunk_at_pos(start);
        if (end != start) this.split_chunk_at_pos(end);

        // grab all the chunks between start and end, except colorization ones
        var chunks = [];
        chunks.push(linechunk_color(color, bgcolor));

        var pos = 0;
        var copying = false;
        for (var idx = 0; idx < this.chunks.length; ++idx) {
            if (pos >= end) break;
            if (pos >= start) copying = true;
            if (copying && this.chunks[idx].type() != 'color') chunks.push(this.chunks[idx]);
            var len = this.chunks[idx].length();
            pos += len;
        }

        return this.replace_with_linechunks(start, end, chunks);
    }
    res.replace = function(start, end, replacement, color, bgcolor) {
        var chunks = [];
        if ((replacement != null) && replacement.length) {
            if ((color != undefined) || (bgcolor != undefined))
                chunks.push(linechunk_color(color, bgcolor));
            chunks.push(linechunk_text(replacement, true));
        }
        return this.replace_with_linechunks(start, end, chunks);
    }
    res.linkify = function(start, end, color, link_command, link_text) {
        if (!link_command) return;
        if (!link_text)
            link_text = this.text().substr(start, end - start + 1);
        var chunks = [];
        chunks.push(linechunk_mxp_send(color, link_command, link_text));
        return this.replace_with_linechunks(start, end, chunks);
    }


    // start = first index to replace, end = first index to -not- replace (i.e. end-start = length to replace)
    res.replace_with_linechunks = function(start, end, linechunks)
    {
        if ((this.chunks == null) || (this.chunks.length == 0)) {
            this.chunks = linechunks;
            return;
        }
        if (end < start) end = start;
        // ensure that no chunk spans the thresholds (simplifies the logic)
        this.split_chunk_at_pos(start);
        if (end != start) this.split_chunk_at_pos(end);

        // remove old chunks, remember state at the end (so that colors match)
        var pos = 0;
        var removeidx = -1;
        var removecount = 0;
        var state = {};
        var removing = false;
        for (var idx = 0; idx < this.chunks.length; ++idx) {
            if (pos >= end) break;
            if ((pos >= start) && (removeidx < 0)) removeidx = idx;
            if (removeidx >= 0) removecount += 1;

            var len = this.chunks[idx].length();
            pos += len;
            state = this.chunks[idx].update_state(state);
        }
        if (removeidx < 0) removeidx = 0;

        linechunks = linechunks || [];  // linechunks must exist, as we'll be adding the new state
        var state_chunks = client.apply_line_state(state);
        linechunks.push(linechunk_color('reset', null));   // reset the color -- fixes background color leakage
        for (var s = 0; s < state_chunks.length; ++s)
            linechunks.push(state_chunks[s]);
        // this calls splice with (removeidx, removecount, (contents of linechunks)) as params
        Array.prototype.splice.apply(this.chunks, [removeidx, removecount].concat(linechunks));
    }

    res.remove = function(start, end) {
        return this.replace_with_linechunks(startd, end, null);
    }
    res.formatted = function() {
        var res = '';
        this.prefix = '';
        this.suffix = '';
        for (var i = 0; i < this.chunks.length; ++i)
            res += this.chunks[i].formatted(this);
        return this.prefix + res + this.suffix;
    }
    res.text = function() {
        var res = '';
        for (var i = 0; i < this.chunks.length; ++i)
            res += this.chunks[i].text(this);
        return res;
    }

    return res;
}

// returns chunks, does not actually alter anything
function apply_line_state(state) {
    var res = [];
    if ((state.fg != null) || (state.bg != null))
        res.push(linechunk_color(state.fg, state.bg));
    else
        res.push(linechunk_color('reset', null));
    return res;
}


// parses a line - assumes a complete line (no buffering here)
function parse_line(line, state) {

    var chunks = apply_line_state(state);
    if (!state.bold) state.bold = 0;

    function handle_ansi256_color(color) {  // sequences are 38;5;X and 48;5;X
        if (state.fg256 == 2) {
            state.fg256 = 0;
            state.ansi_fg = color;
            fg = get_ansi_color(color, false);
            var c = linechunk_color(fg, null);
            state = c.update_state(state);
            chunks.push(c);
            return true;
        }
        if (state.bg256 == 2) {
            state.bg256 = 0;
            state.ansi_bg = color;
            bg = get_ansi_color(color, true);
            var c = linechunk_color(null, bg);
            state = c.update_state(state);
            chunks.push(c);
            return true;
        }
        if (state.fg256 == 1) {
            if (color == 5) state.fg256++;
            else state.fg256 = 0;
            return true;
        }
        if (state.bg256 == 1) {
            if (color == 5) state.bg256++;
            else state.bg256 = 0;
            return true;
        }
        if (color == 38) {
            state.fg256 = 1;
            return true;
        }
        if (color == 48) {
            state.bg256 = 1;
            return true;
        }

        return false;
    }

    function handle_ansi_color(color) {
        var fg = null;
        var bg = null;

        // 256 color support
        if (handle_ansi256_color(color)) return;

        if ((color >= 30) && (color <= 37)) {  // fg
            state.ansi_fg = color - 30;
            fg = get_ansi_color(state.ansi_fg + state.bold * 8, false);
        }
        if ((color >= 40) && (color <= 47)) {  // bg
            state.ansi_bg = color - 40;
            bg = get_ansi_color(state.ansi_bg, true);
        }
        if (color == 1) {  // bold on
            state.bold = 1;
            var color = state.ansi_fg;
            if (color === undefined) color = 7;
            fg = get_ansi_color(color + state.bold * 8, false);
        }
        if (color == 22) {  // bold off
            state.bold = 0;
            var color = state.ansi_fg;
            if (color === undefined) color = 7;
            fg = get_ansi_color(color + state.bold * 8, false);
        }
        if (color == 0) {  // reset
            state.bold = 0;
            delete state.ansi_fg;
            delete state.ansi_bg;
            fg = 'reset';
        }

        if ((fg !== null) || (bg !== null)) {
            var c = linechunk_color(fg, bg);
            state = c.update_state(state);
            chunks.push(c);
        }
    }

    function handle_regular_text(text) {
        chunks.push(linechunk_text(text));
    }

    function handle_mxp_tag(tag) {
        tag = tag.replace (/\x1B\[\dz/g, '');  // strip ANSI tags
        tag = tag.replace (/\x1B\[[\d;]+m/g, '');  // strip color ANSI tags - there shouldn't be any ideally, but games sometimes send them
        // swap out the Rapture markers for real tags (GMCP only)
        tag = tag.replace (/\x03/g, '<');
        tag = tag.replace (/\x04/g, '>');
        if (tag.toLowerCase() == '<version>') {
            send_MXP ("<version mxp=1.0 client=IRE-ChroMUD version="+client.client_version+(client.real_mobile?'mobile':'')+" >");
            return;
        }
        if (tag.toLowerCase() == '<support>') {
            send_MXP ("<supports +send +color>");
            return;
        }

        var match = tag.match (/send href="([^"]*)"/i);
        if (match == null) return;
        var cmd = match[1];
        match = tag.match(/" (prompt)\b/i);
        var isprompt = (match == null) ? undefined : match[1];
        match = tag.match(/hint="([^"]*)"/i);
        var hint = (match == null) ? undefined : match[1];
        match = tag.match (/>([^>]+)<\/send>/i);
        var text = (match == null) ? '' : match[1];
        match = tag.match (/<color ([^>]+)>/i);
        var color = (match == null) ? undefined : match[1];
        chunks.push(linechunk_mxp_send(color, cmd, text, hint, isprompt));
    }

    var buffer = '';
    // Alright, parse the line character by character and handle all the special cases
    while (line.length) {
        var ch = line.charAt(0);
        var c = line.charCodeAt(0);
        line = line.substr(1);
        if (c == 27) {
            if (buffer.length) {
                handle_regular_text(buffer);
                buffer = '';
            }
            // ANSI sequence
            nums = [];
            n = null;
            while (line.length) {
                var ch = line.charAt(0);
                line = line.substr(1);
                if (ch == '[') continue;
                if ((ch >= '0') && (ch <= '9'))
                    n = 10 * n + (ch.charCodeAt(0) - '0'.charCodeAt(0));
                else if (ch == ';') {
                    if (n !== null) nums.push(n);
                    n = null;
                }
                else if (ch == 'm') {
                    if (n !== null) nums.push(n);
                    for (var i = 0; i < nums.length; ++i)
                        handle_ansi_color(nums[i]);
                    break;
                }
                else if ((ch == 'z') && (n == 4)) {
                    // MXP TEMP SECURE tag -- the games only ever send these, no need to support the rest
                    var tagend = -1;
                    var endchar = '>';
                    if (line.substr(0, 1) == '<') {
                        if (line.substr(0, 5).toLowerCase() == '<send') {
                            tagend = line.search(/<\/send>/i);
                            if (tagend >= 0) tagend += 7;
                        }
                        else if (line.substr(0, 6).toLowerCase() == '<color') {
                            tagend = line.search(/<\/color>/i);
                            if (tagend >= 0) tagend += 8;
                        }
                        else if (line.substr(0, 8).toLowerCase() == '<support') {
                            tagend = line.search(/>/i);
                            if (tagend >= 0) tagend += 1;
                        }
                        else if (line.substr(0, 8).toLowerCase() == '<version') {
                            tagend = line.search(/>/i);
                            if (tagend >= 0) tagend += 1;
                        }

                    } else if (line.charCodeAt(0) == 3) {   // Rapture ecodes tags like this when they come in GMCP
                        endchar = '\x04';
                        if (line.substr(0, 5).toLowerCase() == '\x03send') {
                            tagend = line.search(/\x03\/send\x04/i);
                            if (tagend >= 0) tagend += 7;
                        }
                        else if (line.substr(0, 6).toLowerCase() == '\x03color') {
                            tagend = line.search(/\x03\/color\x04/i);
                            if (tagend >= 0) tagend += 8;
                        }
                    }
                    if (tagend >= 0) {
                        var tag = line.substr(0, tagend);
                        line = line.substr(tagend);
                        handle_mxp_tag(tag);
                    } else {
                        // we got some other tag, strip it out
                        tagend = line.search(endchar);
                        if (tagend >= 0) line = line.substr(tagend + 1);
                    }

                    break;
                }
                else
                    break;   // unsupported ANSI sequence, ignore it
            }
            continue;
        }
        // anything else - just copy it to the buffer
        buffer += ch;
    }
    if (buffer.length)
        handle_regular_text(buffer);

    return linechunks_create(chunks);
}

// convenience wrapper, for GMCP and the like - not used by the main parsing, as it doesn't preserve the state
function parse_and_format_line(line)
{
    var chunks = parse_line(line, {});
    return chunks.formatted();
}

