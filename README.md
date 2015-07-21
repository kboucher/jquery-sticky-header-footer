# jQuery Sticky Header Footer
jQuery plugin that dynamically sticks content headers and footers to the top and bottom of viewport.

## Usage
    $("table").stickyHeaderFooter();

    $("table").stickyHeaderFooter({
        bodySelector: '.list-body',            // default is 'tbody'
        bottom: '20px',                        // default is '0'
        footerSelector: '.list-footer',        // default is 'tfoot'
        headerSelector: '.list-header',        // default is 'thead'
        top: '60px'                            // default is '0'
    });

## How does it work?
Sticky Header Footer makes a clone of the desired sticky header and/or footer and places it in a DIV above or below the original stuck component. Clones are used in order to simplify maintaining layout (especially with tables). The clones are swapped when stuck and unstuck to ensure DOM updates to the header and/or footer are visible.

## Markup structure
### Tables
For best results when applying Sticky Header Footer to a table, pass the table itself as the element to be processed.

    <table>                                         <!-- Pass this element to the plugin -->
        <thead>                                     <!-- Header element (by default) -->
            <tr>
                <th>Header text</th>
                <th>Header text</th>
                <th>Header text</th>
            </tr>
        </thead>
        <tbody>                                     <!-- Body element (by default) -->
            <tr>
                <td>Body text (row 1)</td>
                <td>Body text (row 1)</td>
                <td>Body text (row 1)</td>
            </tr>
            <tr>
                <td>Body text (row 2)</td>
                <td>Body text (row 2)</td>
                <td>Body text (row 2)</td>
            </tr>
        </tbody>
        <tfoot>                                     <!-- Footer element (by default) -->
            <tr>
                <td colspan="3">Footer text</td>
            </tr>
        </tfoot>
    </table>

### Other elements
It's important to remember that Sticky Header Footer requires a wrapper element around the elements that define the header, footer and body of your Sticky Header Footer list.

    <div class="list-wrapper">                      <!-- Pass this element to the plugin -->
        <div class="list-header">                   <!-- Header element (footerSelector=".list-header") -->
            ...
        </div>
        <div class="list-body">                     <!-- Body element (footerSelector=".list-body") -->
            ...
        </div>
        <div class="list-footer">                   <!-- Footer element (footerSelector=".list-footer") -->
            ...
        </div>
    </div>
