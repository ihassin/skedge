module MainHelper
	Filters = {
		"credits" => ["Any", "1-2", "3-4", "5+"],
		"term" => ["Either", "Fall", "Spring"],
		"sort" => ["Course #", "Start time (early to late)", "Start time (late to early)", "Class size (small to large)"]
	}

	def inline_form(link_text, query=link_text, params={})
		sets = ""
		
		form_tag(".", method:"post", class:"form-inline inline") do
			hiddens = hidden_field_tag 'query', query #implicit field that will send the query (ie, query will go into \1)
			params.each do |k, v|
				hiddens += hidden_field_tag k, v #filters & stuff (from params arg)
			end
			link = link_to link_text, "#", :onclick => "#{sets} $(this).closest('form').submit();" #submit the closest form
			hiddens + link
		end
	end

	def instructor_dropdown_action(i, action, text)
		"<li><a href='#' onclick=\"#{action}('#{i}', this); return false;\">#{text}</a></li>"
	end

	def instructor_dropdown(i)
		last = i.split.first.downcase.strip
		full = (i.split[1..-1] + i.split[0..0]).join(" ").downcase.strip
		raw('<ul class="dropdown-menu" role="menu">' +
			instructor_dropdown_action(full, "prof_email", "Email instructor") +
			instructor_dropdown_action(last, "prof_rmp", "Look up on Rate My Professors") +
			'<li class="divider"></li>' +
			instructor_dropdown_action(last, "prof_search", "Courses taught by this instructor") +
			'</ul>')
	end

	def should_split_cols(subcourses)
		subcourses.size > 3
	end

	def bracket_link(txt, link, hash={})
		raw("<span>[<span style='margin:0 2px 0 2px;'>" + link_to(txt, link, hash) + "</span>]</span>")
	end

	def default_filter?(filter)
		!params[filter] || Filters[filter].first == params[filter]
	end

	def get_filter(filter)
		params[filter] || Filters[filter].first
	end

	def fake_a(txt)
		link_to txt, "#", {onclick:"return false;"}
	end

	def should_hide_section?(section)
		params[:instructor_search] and not section.instructors =~ /#{params[:instructor_search]}/i
	end
end
